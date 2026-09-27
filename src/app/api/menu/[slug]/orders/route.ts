import { NextRequest, NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api-handler";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { PushNotificationPort } from "@/modules/shared/infrastructure/PushNotificationPort";
import { DomainError } from "@/modules/shared/domain/errors";
import { domainErrorToHttp } from "@/modules/shared/application/domain-error-http";
import { createPrismaOrderService } from "@/modules/ordering/infrastructure/prisma/create-order-service";
import { orderResponse } from "@/modules/ordering/infrastructure/http/order-response";
import { createCustomerTableActorService } from "@/modules/table-service/infrastructure/http/create-customer-table-actor-service";

const orderService = createPrismaOrderService();
const customerTableActorService = createCustomerTableActorService();
const notifications = new PushNotificationPort();

function errorResponse(error: unknown) {
  const mapped = domainErrorToHttp(error);
  if (error instanceof DomainError && Array.isArray(error.details?.unavailableItemIds)) {
    return NextResponse.json({
      error: "One or more items are no longer available. Please update your cart and try again.",
      unavailableItemIds: error.details.unavailableItemIds,
    }, { status: mapped.status });
  }
  return NextResponse.json({ error: mapped.message }, { status: mapped.status });
}

export const POST = withApiLogging(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const idempotencyKey = typeof body?.idempotencyKey === "string"
    ? body.idempotencyKey.trim()
    : null;

  if (idempotencyKey && (idempotencyKey.length > 100 || !/^[A-Za-z0-9:_-]+$/.test(idempotencyKey))) {
    return NextResponse.json({ error: "Invalid order request key." }, { status: 400 });
  }

  try {
    const actor = await customerTableActorService.resolve({
      slug,
      tableNumber: body?.tableNumber,
      tableToken: body?.tableToken,
    });

    if (actor.allowedIp && getClientIp(req) !== actor.allowedIp) {
      return NextResponse.json(
        { error: "Please connect to the restaurant WiFi before placing an order." },
        { status: 403 },
      );
    }

    const requestLimit = checkRateLimit(
      `order:${actor.tableId}:${getClientIp(req)}`,
      12,
      10 * 60 * 1000,
    );
    if (!requestLimit.allowed) {
      return NextResponse.json(
        { error: "Too many order attempts. Please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": String(requestLimit.retryAfterSeconds) } },
      );
    }

    const recentOrderCount = await orderService.countRecentCustomerOrders(
      actor,
      actor.tableId,
      new Date(Date.now() - 10 * 60 * 1000),
    );
    if (recentOrderCount >= 12) {
      return NextResponse.json(
        { error: "This table has reached the short-term order limit. Please ask a waiter for help." },
        { status: 429, headers: { "Retry-After": "600" } },
      );
    }

    const items = Array.isArray(body?.items)
      ? body.items.map((item: { itemId?: unknown; quantity?: unknown }) => ({
          itemId: item.itemId as string,
          quantity: Number(item.quantity),
        }))
      : [];
    const result = await orderService.createCustomerOrder(actor, {
      restaurantId: actor.restaurantId,
      tableId: actor.tableId,
      items,
      note: typeof body?.note === "string" ? body.note : null,
      customerRequestId: idempotencyKey,
    });

    if (result.duplicate) {
      return NextResponse.json(orderResponse(result.order));
    }

    void notifications.sendToRestaurant({
      restaurantId: actor.restaurantId,
      staffRoles: ["COOK", "CHEF"],
      title: `New order - ${actor.tableLabel || `Table ${actor.tableNumber}`}`,
      body: `${result.order.lines.length} item${result.order.lines.length !== 1 ? "s" : ""} - Rs. ${result.order.total.toLocaleString("en-IN")}`,
      url: `/dashboard/restaurant/${actor.restaurantId}/staff`,
      data: {
        type: "new_order",
        orderId: result.order.id ?? "",
        tableNumber: String(actor.tableNumber),
        restaurantId: actor.restaurantId,
      },
    });

    return NextResponse.json(orderResponse(result.order), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withApiLogging } from "@/lib/api-handler";
import { domainErrorToHttp } from "@/modules/shared/application/domain-error-http";
import { PushNotificationPort } from "@/modules/shared/infrastructure/PushNotificationPort";
import { createPrismaOrderService } from "@/modules/ordering/infrastructure/prisma/create-order-service";
import { orderResponse } from "@/modules/ordering/infrastructure/http/order-response";
import { resolveOrderActor } from "@/modules/ordering/infrastructure/http/order-actor";
import type { OrderStatus } from "@/modules/ordering/domain/order-status";

const orderService = createPrismaOrderService();
const notifications = new PushNotificationPort();
const validStatuses: OrderStatus[] = ["NEW", "PREPARING", "SERVED", "PAID", "CANCELED"];

function errorResponse(error: unknown) {
  const mapped = domainErrorToHttp(error);
  return NextResponse.json({ error: mapped.message }, { status: mapped.status });
}

export const PATCH = withApiLogging(async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, orderId } = await params;
  const actor = await resolveOrderActor(id, {
    id: session.user.id,
    actorType: session.user.actorType,
  });
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const status = body?.status as OrderStatus;
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const result = await orderService.changeStatus(actor, {
      restaurantId: id,
      orderId,
      status,
    });

    if (status === "SERVED") {
      const tableLabel = result.order.table?.label || `Table ${result.order.table?.number ?? ""}`;
      void notifications.sendToRestaurant({
        restaurantId: id,
        excludeUserId: session.user.id,
        staffRoles: ["WAITER"],
        title: `✅ Order ready — ${tableLabel}`,
        body: `${result.order.lines.length} item${result.order.lines.length !== 1 ? "s" : ""} ready to serve`,
        url: `/dashboard/restaurant/${id}/orders`,
        data: {
          type: "order_status",
          orderId: result.order.id ?? orderId,
          status: "SERVED",
          tableNumber: String(result.order.table?.number ?? ""),
          restaurantId: id,
        },
      });
    }

    return NextResponse.json(orderResponse(result.order));
  } catch (error) {
    return errorResponse(error);
  }
});

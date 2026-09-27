import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withApiLogging } from "@/lib/api-handler";
import { domainErrorToHttp } from "@/modules/shared/application/domain-error-http";
import { PushNotificationPort } from "@/modules/shared/infrastructure/PushNotificationPort";
import { createPrismaOrderService } from "@/modules/ordering/infrastructure/prisma/create-order-service";
import { orderResponse } from "@/modules/ordering/infrastructure/http/order-response";
import { resolveOrderActor } from "@/modules/ordering/infrastructure/http/order-actor";

const orderService = createPrismaOrderService();
const notifications = new PushNotificationPort();

function errorResponse(error: unknown) {
  const mapped = domainErrorToHttp(error);
  return NextResponse.json({ error: mapped.message }, { status: mapped.status });
}

export const GET = withApiLogging(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const actor = await resolveOrderActor(id, {
    id: session.user.id,
    actorType: session.user.actorType,
  });
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const orders = await orderService.listOrders(actor, id);
    return NextResponse.json(orders.map(orderResponse));
  } catch (error) {
    return errorResponse(error);
  }
});
export const POST = withApiLogging(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const actor = await resolveOrderActor(id, {
    id: session.user.id,
    actorType: session.user.actorType,
  });
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const items = Array.isArray(body?.items)
      ? body.items.map((item: { itemId?: unknown; quantity?: unknown }) => ({
          itemId: item.itemId as string,
          quantity: Number(item.quantity),
        }))
      : [];
    const result = await orderService.createStaffOrder(actor, {
      restaurantId: id,
      tableId: body?.tableId,
      items,
      note: body?.note,
    });
    const response = orderResponse(result.order);
    const tableLabel = result.order.table?.label || `Table ${result.order.table?.number ?? ""}`;
    void notifications.sendToRestaurant({
      restaurantId: id,
      excludeUserId: session.user.id,
      staffRoles: ["COOK", "CHEF"],
      title: `🍽️ New Order — ${tableLabel}`,
      body: `${result.order.lines.length} item(s) · Rs. ${result.order.total.toLocaleString("en-IN")}`,
      url: `/dashboard/restaurant/${id}/orders`,
      data: {
        type: "new_order",
        orderId: result.order.id ?? "",
        tableNumber: String(result.order.table?.number ?? ""),
        restaurantId: id,
      },
    });
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});

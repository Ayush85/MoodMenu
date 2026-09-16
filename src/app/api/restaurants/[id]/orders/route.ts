import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendPush } from "@/lib/push";
import { withApiLogging } from "@/lib/api-handler";

interface CreateOrderItem {
  itemId?: unknown;
  quantity?: unknown;
}

type AccessInfo =
  | { kind: "OWNER" }
  | { kind: "STAFF"; role: "WAITER" | "COOK" | "CHEF" };

async function getRestaurantAccess(restaurantId: string, sessionUser: { id: string; actorType?: "USER" | "STAFF" }): Promise<AccessInfo | null> {
  if (sessionUser.actorType === "STAFF") {
    const staffRecord = await prisma.restaurantStaff.findFirst({
      where: { id: sessionUser.id, restaurantId, isActive: true },
      select: { id: true, role: true },
    });
    if (!staffRecord) return null;
    return { kind: "STAFF", role: staffRecord.role as "WAITER" | "COOK" | "CHEF" };
  }

  const ownerRecord = await prisma.restaurant.findFirst({
    where: { id: restaurantId, ownerId: sessionUser.id },
    select: { id: true },
  });
  if (!ownerRecord) return null;
  return { kind: "OWNER" };
}

export const GET = withApiLogging(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const access = await getRestaurantAccess(id, {
    id: session.user.id,
    actorType: session.user.actorType,
  });

  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const orders = await prisma.orderTicket.findMany({
    where: { restaurantId: id },
    include: {
      table: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(orders);
});

export const POST = withApiLogging(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const tableId = body?.tableId as string | undefined;
  const note = body?.note as string | undefined;
  const items = Array.isArray(body?.items) ? body.items as CreateOrderItem[] : [];

  if (!tableId || items.length === 0 || items.length > 50) {
    return NextResponse.json({ error: "Table and at least one item are required" }, { status: 400 });
  }

  const access = await getRestaurantAccess(id, {
    id: session.user.id,
    actorType: session.user.actorType,
  });

  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (access.kind === "STAFF" && access.role !== "WAITER") {
    return NextResponse.json({ error: "Only waiters can take new orders" }, { status: 403 });
  }

  const table = await prisma.restaurantTable.findFirst({
    where: { id: tableId, restaurantId: id },
    select: { id: true },
  });

  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  const quantities = new Map<string, number>();
  for (const item of items) {
    if (typeof item.itemId !== "string" || !item.itemId) {
      return NextResponse.json({ error: "Order items are invalid" }, { status: 400 });
    }
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return NextResponse.json({ error: "Each item quantity must be between 1 and 20" }, { status: 400 });
    }
    const nextQuantity = (quantities.get(item.itemId) || 0) + quantity;
    if (nextQuantity > 20) {
      return NextResponse.json({ error: "You can order up to 20 of each item" }, { status: 400 });
    }
    quantities.set(item.itemId, nextQuantity);
  }

  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: Array.from(quantities.keys()) },
      isAvailable: true,
      category: { restaurantId: id },
    },
    select: { id: true, name: true, price: true },
  });

  if (menuItems.length !== quantities.size) {
    return NextResponse.json({ error: "One or more items are unavailable" }, { status: 409 });
  }

  const lineItems = menuItems.map((item) => {
    const quantity = quantities.get(item.id)!;
    return {
      itemName: item.name,
      quantity,
      unitPrice: item.price,
      lineTotal: item.price * quantity,
    };
  });

  const total = lineItems.reduce((sum, line) => sum + line.lineTotal, 0);
  if (!Number.isFinite(total) || total > 100000) {
    return NextResponse.json({ error: "This order total is too large" }, { status: 400 });
  }

  const order = await prisma.$transaction(async (tx) => {
    let tableSession = await tx.tableSession.findFirst({
      where: { tableId, status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
    });

    if (!tableSession) {
      tableSession = await tx.tableSession.create({
        data: { restaurantId: id, tableId },
      });
    }

    const created = await tx.orderTicket.create({
      data: {
        restaurantId: id,
        tableId,
        sessionId: tableSession.id,
        note: note?.trim().slice(0, 240) || null,
        total,
        items: { create: lineItems },
      },
      include: { table: true, items: true },
    });

    await tx.tableSession.update({
      where: { id: tableSession.id },
      data: { totalAmount: { increment: total }, lastActivityAt: new Date() },
    });

    return created;
  });

  // Notify kitchen staff (non-blocking)
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: {
      ownerId: true,
      staffMembers: {
        where: { isActive: true, role: { in: ["COOK", "CHEF"] } },
        select: { id: true },
      },
    },
  });

  if (restaurant) {
    const recipientIds = [
      restaurant.ownerId,
      ...restaurant.staffMembers.map((s) => s.id),
    ].filter((rid) => rid !== session.user!.id);

    if (recipientIds.length > 0) {
      const tableLabel = order.table.label || `Table ${order.table.number}`;
      sendPush({
        title: `🍽️ New Order — ${tableLabel}`,
        body: `${lineItems.length} item(s) · Rs. ${total.toLocaleString("en-IN")}`,
        userIds: recipientIds,
        url: `/dashboard/restaurant/${id}/staff`,
        data: {
          type: "new_order",
          orderId: order.id,
          tableNumber: String(order.table.number),
          restaurantId: id,
        },
      });
    }
  }

  return NextResponse.json(order, { status: 201 });
});

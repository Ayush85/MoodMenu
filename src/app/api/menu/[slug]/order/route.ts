import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPush } from "@/lib/push";
import { isSessionStale } from "@/lib/session";

interface OrderItemInput {
  itemId: string;
  quantity: number;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let body: { tableNumber?: unknown; items?: unknown; note?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const tableNumber = parseInt(String(body.tableNumber));
  if (!tableNumber || tableNumber < 1 || tableNumber > 9999) {
    return NextResponse.json({ error: "Invalid table number" }, { status: 400 });
  }

  const rawItems = body.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
  }

  if (rawItems.length > 50) {
    return NextResponse.json({ error: "Too many items in one order" }, { status: 400 });
  }

  const inputItems: OrderItemInput[] = rawItems
    .map((i) => ({
      itemId: String(i?.itemId || "").trim(),
      quantity: Math.floor(Number(i?.quantity) || 0),
    }))
    .filter((i) => i.itemId && i.quantity >= 1 && i.quantity <= 99);

  if (inputItems.length === 0) {
    return NextResponse.json({ error: "No valid items in order" }, { status: 400 });
  }

  const note = body.note ? String(body.note).trim().slice(0, 300) : null;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      tables: { where: { number: tableNumber } },
      staffMembers: {
        where: { isActive: true, role: "WAITER" },
        select: { id: true },
      },
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  if (restaurant.tables.length === 0) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  const table = restaurant.tables[0];

  // Find or create active session for this table — resolved before the rate
  // limit so throttling is scoped to the current dine-in visit, not raw table history
  let session = await prisma.tableSession.findFirst({
    where: { restaurantId: restaurant.id, tableId: table.id, status: "ACTIVE" },
  });

  if (session && isSessionStale(session)) {
    await prisma.tableSession.update({
      where: { id: session.id },
      data: { status: "CLOSED", endedAt: new Date() },
    });
    session = null;
  }

  if (!session) {
    session = await prisma.tableSession.create({
      data: { restaurantId: restaurant.id, tableId: table.id, totalAmount: 0 },
    });
  }

  // Rate limit: max 3 orders per session per 30 minutes
  const recentOrderCount = await prisma.orderTicket.count({
    where: {
      sessionId: session.id,
      createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
    },
  });

  if (recentOrderCount >= 3) {
    return NextResponse.json(
      { error: "Too many orders from this table. Please ask your waiter for help." },
      { status: 429 }
    );
  }

  // Resolve item IDs to actual menu items (server-side price validation)
  const itemIds = [...new Set(inputItems.map((i) => i.itemId))];
  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: itemIds },
      category: { restaurantId: restaurant.id },
      isAvailable: true,
    },
    select: { id: true, name: true, price: true },
  });

  const itemMap = new Map(menuItems.map((m) => [m.id, m]));
  const resolvedItems = inputItems
    .map((i) => {
      const item = itemMap.get(i.itemId);
      if (!item) return null;
      return {
        itemName: item.name,
        quantity: i.quantity,
        unitPrice: item.price,
        lineTotal: item.price * i.quantity,
      };
    })
    .filter((i): i is NonNullable<typeof i> => i !== null);

  if (resolvedItems.length === 0) {
    return NextResponse.json({ error: "None of the selected items are available" }, { status: 400 });
  }

  const total = resolvedItems.reduce((sum, line) => sum + line.lineTotal, 0);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.orderTicket.create({
      data: {
        restaurantId: restaurant.id,
        tableId: table.id,
        sessionId: session.id,
        note,
        total,
        items: { create: resolvedItems },
      },
      include: { table: true, items: true },
    });

    await tx.tableSession.update({
      where: { id: session.id },
      data: { totalAmount: { increment: total }, lastActivityAt: new Date() },
    });

    return created;
  });

  // Push notification to owner + active waiters (non-blocking)
  const recipientIds = [
    restaurant.ownerId,
    ...restaurant.staffMembers.map((s) => s.id),
  ];
  const tableLabel = order.table.label || `Table ${order.table.number}`;

  sendPush({
    title: `🍽️ New Order — ${tableLabel}`,
    body: `${resolvedItems.length} item(s) · Rs. ${total.toLocaleString("en-IN")}`,
    userIds: recipientIds,
    url: `/dashboard/restaurant/${restaurant.id}/staff`,
    data: {
      type: "new_order",
      orderId: order.id,
      tableNumber: String(table.number),
      restaurantId: restaurant.id,
    },
  });

  return NextResponse.json(
    {
      id: order.id,
      status: order.status,
      sessionId: session.id,
      tableNumber: order.table.number,
      tableLabel: order.table.label,
      total,
      items: order.items.map((line) => ({
        itemName: line.itemName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      })),
      createdAt: order.createdAt,
    },
    { status: 201 }
  );
}

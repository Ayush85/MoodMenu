import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPush } from "@/lib/push";
import { withApiLogging } from "@/lib/api-handler";
import { isValidTableToken } from "@/lib/table-token";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";

interface RequestedItem {
  itemId?: unknown;
  quantity?: unknown;
}

function getTableNumber(value: unknown): number | null {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 9999) return null;
  return number;
}

export const POST = withApiLogging(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const tableNumber = getTableNumber(body?.tableNumber);
  const tableToken = typeof body?.tableToken === "string" ? body.tableToken : null;
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey.trim() : null;

  if (idempotencyKey && (idempotencyKey.length > 100 || !/^[A-Za-z0-9:_-]+$/.test(idempotencyKey))) {
    return NextResponse.json({ error: "Invalid order request key." }, { status: 400 });
  }

  if (!tableNumber || !tableToken) {
    return NextResponse.json({ error: "Please scan the QR code at your table to order." }, { status: 400 });
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      ownerId: true,
      allowedIp: true,
      tables: { where: { number: tableNumber }, select: { id: true, number: true, label: true } },
      staffMembers: {
        where: { isActive: true, role: { in: ["COOK", "CHEF"] } },
        select: { id: true },
      },
    },
  });

  if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  if (!isValidTableToken(restaurant.id, tableNumber, tableToken)) {
    return NextResponse.json({ error: "This table link is no longer valid. Please scan the QR code again." }, { status: 400 });
  }

  if (restaurant.allowedIp && getClientIp(req) !== restaurant.allowedIp) {
    return NextResponse.json({ error: "Please connect to the restaurant WiFi before placing an order." }, { status: 403 });
  }

  const table = restaurant.tables[0];
  if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

  if (idempotencyKey) {
    const existing = await prisma.orderTicket.findUnique({
      where: { customerRequestId: idempotencyKey },
      include: { table: true, items: true },
    });
    if (existing) {
      if (existing.restaurantId !== restaurant.id || existing.tableId !== table.id) {
        return NextResponse.json({ error: "This order request key has already been used." }, { status: 409 });
      }
      return NextResponse.json(existing);
    }
  }

  const requestLimit = checkRateLimit(`order:${table.id}:${getClientIp(req)}`, 12, 10 * 60 * 1000);
  if (!requestLimit.allowed) {
    return NextResponse.json(
      { error: "Too many order attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(requestLimit.retryAfterSeconds) } },
    );
  }

  const recentOrderCount = await prisma.orderTicket.count({
    where: {
      tableId: table.id,
      status: { not: "CANCELED" },
      createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
    },
  });
  if (recentOrderCount >= 12) {
    return NextResponse.json(
      { error: "This table has reached the short-term order limit. Please ask a waiter for help." },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }

  const requestedItems = Array.isArray(body?.items) ? body.items as RequestedItem[] : [];
  if (requestedItems.length === 0 || requestedItems.length > 50) {
    return NextResponse.json({ error: "Add at least one menu item to your order." }, { status: 400 });
  }

  const quantities = new Map<string, number>();
  for (const requested of requestedItems) {
    if (typeof requested.itemId !== "string") {
      return NextResponse.json({ error: "One or more menu items are invalid." }, { status: 400 });
    }
    const quantity = Number(requested.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return NextResponse.json({ error: "Each item quantity must be between 1 and 20." }, { status: 400 });
    }
    const nextQuantity = (quantities.get(requested.itemId) || 0) + quantity;
    if (nextQuantity > 20) {
      return NextResponse.json({ error: "You can order up to 20 of each item." }, { status: 400 });
    }
    quantities.set(requested.itemId, nextQuantity);
  }

  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: Array.from(quantities.keys()) },
      isAvailable: true,
      category: { restaurantId: restaurant.id },
    },
    select: { id: true, name: true, price: true },
  });

  if (menuItems.length !== quantities.size) {
    const foundIds = new Set(menuItems.map((item) => item.id));
    const missingIds = Array.from(quantities.keys()).filter((id) => !foundIds.has(id));
    const missingItems = await prisma.menuItem.findMany({
      where: { id: { in: missingIds }, category: { restaurantId: restaurant.id } },
      select: { id: true, name: true },
    });
    const missingNames = missingItems.map((item) => item.name);
    const unavailableItemIds = missingIds;
    const label = missingNames.length > 0 ? missingNames.join(", ") : "One or more items";
    const isPlural = missingNames.length !== 1;
    return NextResponse.json(
      {
        error: `${label} ${isPlural ? "are" : "is"} no longer available. Please remove ${isPlural ? "them" : "it"} from your cart and try again.`,
        unavailableItemIds,
      },
      { status: 409 },
    );
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
  const total = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  if (!Number.isFinite(total) || total > 100000) {
    return NextResponse.json({ error: "This order total is too large. Please ask a waiter for help." }, { status: 400 });
  }
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 240) : null;

  const order = await prisma.$transaction(async (tx) => {
    let tableSession = await tx.tableSession.findFirst({
      where: { tableId: table.id, status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
    });

    if (!tableSession) {
      tableSession = await tx.tableSession.create({
        data: { restaurantId: restaurant.id, tableId: table.id },
      });
    }

    const created = await tx.orderTicket.create({
      data: {
        restaurantId: restaurant.id,
        tableId: table.id,
        sessionId: tableSession.id,
        customerRequestId: idempotencyKey,
        note,
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

  const recipientIds = [restaurant.ownerId, ...restaurant.staffMembers.map((staff) => staff.id)];
  if (recipientIds.length > 0) {
    const tableLabel = order.table.label || `Table ${order.table.number}`;
    sendPush({
      title: `New order - ${tableLabel}`,
      body: `${lineItems.length} item${lineItems.length !== 1 ? "s" : ""} - Rs. ${total.toLocaleString("en-IN")}`,
      userIds: recipientIds,
      url: `/dashboard/restaurant/${restaurant.id}/staff`,
      data: { type: "new_order", orderId: order.id, tableNumber: String(table.number), restaurantId: restaurant.id },
    });
  }

  return NextResponse.json(order, { status: 201 });
});

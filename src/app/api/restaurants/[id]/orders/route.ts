import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendPush } from "@/lib/push";

interface CreateOrderItem {
  itemName: string;
  quantity: number;
  unitPrice: number;
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

export async function GET(
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
}

export async function POST(
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
  const items = (body?.items || []) as CreateOrderItem[];

  if (!tableId || items.length === 0) {
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

  const normalizedItems = items
    .map((item) => ({
      itemName: (item.itemName || "").trim(),
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
    }))
    .filter((item) => item.itemName && item.quantity > 0);

  if (normalizedItems.length === 0) {
    return NextResponse.json({ error: "Order items are invalid" }, { status: 400 });
  }

  const lineItems = normalizedItems.map((item) => ({
    itemName: item.itemName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.unitPrice * item.quantity,
  }));

  const total = lineItems.reduce((sum, line) => sum + line.lineTotal, 0);

  const order = await prisma.orderTicket.create({
    data: {
      restaurantId: id,
      tableId,
      note: note?.trim() || null,
      total,
      items: {
        create: lineItems,
      },
    },
    include: {
      table: true,
      items: true,
    },
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
}

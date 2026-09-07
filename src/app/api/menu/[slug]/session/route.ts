import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isSessionStale } from "@/lib/session";

// GET /api/menu/[slug]/session?table=5
// Returns the active session for a table (public, no auth needed)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tableNumber = parseInt(req.nextUrl.searchParams.get("table") || "");

  if (!tableNumber || tableNumber < 1) {
    return NextResponse.json({ session: null });
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!restaurant) return NextResponse.json({ session: null });

  const table = await prisma.restaurantTable.findFirst({
    where: { restaurantId: restaurant.id, number: tableNumber },
    select: { id: true, number: true, label: true },
  });
  if (!table) return NextResponse.json({ session: null });

  const session = await prisma.tableSession.findFirst({
    where: { restaurantId: restaurant.id, tableId: table.id, status: "ACTIVE" },
    include: {
      orders: {
        orderBy: { createdAt: "asc" },
        include: { items: true },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  if (!session) return NextResponse.json({ session: null, table });

  if (isSessionStale(session)) {
    // Fire-and-forget — a stale session shouldn't linger as "ACTIVE" in staff
    // views just because no new order ever triggers the order route's own check
    prisma.tableSession.update({
      where: { id: session.id },
      data: { status: "CLOSED", endedAt: new Date() },
    }).catch(() => { /* best-effort */ });

    return NextResponse.json({ session: null, table });
  }

  return NextResponse.json({
    session: {
      id: session.id,
      status: session.status,
      totalAmount: session.totalAmount,
      startedAt: session.startedAt,
      table: { number: table.number, label: table.label },
      orders: session.orders.map((o) => ({
        id: o.id,
        status: o.status,
        total: o.total,
        note: o.note,
        createdAt: o.createdAt,
        items: o.items.map((line) => ({
          itemName: line.itemName,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
        })),
      })),
    },
    table,
  });
}

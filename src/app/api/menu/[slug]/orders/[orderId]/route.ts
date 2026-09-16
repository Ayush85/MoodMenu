import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withApiLogging } from "@/lib/api-handler";
import { isValidTableToken } from "@/lib/table-token";

export const GET = withApiLogging(async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; orderId: string }> }
) {
  const { slug, orderId } = await params;
  const tableNumber = Number(req.nextUrl.searchParams.get("table"));
  const tableToken = req.nextUrl.searchParams.get("t");

  if (!Number.isInteger(tableNumber) || tableNumber < 1 || !tableToken) {
    return NextResponse.json({ error: "Invalid order link" }, { status: 400 });
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true, tables: { where: { number: tableNumber }, select: { id: true } } },
  });
  if (!restaurant || !isValidTableToken(restaurant.id, tableNumber, tableToken)) {
    return NextResponse.json({ error: "Invalid order link" }, { status: 400 });
  }

  const table = restaurant.tables[0];
  if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

  const order = await prisma.orderTicket.findFirst({
    where: { id: orderId, restaurantId: restaurant.id, tableId: table.id },
    select: {
      id: true,
      status: true,
      note: true,
      total: true,
      createdAt: true,
      updatedAt: true,
      items: { select: { id: true, itemName: true, quantity: true, unitPrice: true, lineTotal: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(order);
});

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { tableNumber, message } = await req.json();

  if (!tableNumber) {
    return NextResponse.json({ error: "Table number is required" }, { status: 400 });
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      tables: { where: { number: parseInt(tableNumber) } },
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  if (restaurant.tables.length === 0) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  const table = restaurant.tables[0];

  // Check for recent pending call from this table (prevent spam)
  const recentCall = await prisma.waiterCall.findFirst({
    where: {
      tableId: table.id,
      status: "PENDING",
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) }, // within 2 min
    },
  });

  if (recentCall) {
    return NextResponse.json(
      { error: "A waiter has already been called. Please wait." },
      { status: 429 }
    );
  }

  const call = await prisma.waiterCall.create({
    data: {
      message: message || null,
      tableId: table.id,
      restaurantId: restaurant.id,
    },
    include: { table: true },
  });

  return NextResponse.json({
    id: call.id,
    tableNumber: call.table.number,
    tableLabel: call.table.label,
    status: call.status,
    createdAt: call.createdAt,
  }, { status: 201 });
}

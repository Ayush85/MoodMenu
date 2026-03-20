import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId: id },
    orderBy: { number: "asc" },
  });

  return NextResponse.json(tables);
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
  const restaurant = await prisma.restaurant.findFirst({
    where: { id, ownerId: session.user.id },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { count } = await req.json();
  const tableCount = Math.min(Math.max(parseInt(count) || 1, 1), 100);

  const existing = await prisma.restaurantTable.findMany({
    where: { restaurantId: id },
    orderBy: { number: "desc" },
    take: 1,
  });

  const startNumber = existing.length > 0 ? existing[0].number + 1 : 1;

  const tables = [];
  for (let i = 0; i < tableCount; i++) {
    const num = startNumber + i;
    tables.push(
      prisma.restaurantTable.create({
        data: {
          number: num,
          label: `Table ${num}`,
          restaurantId: id,
        },
      })
    );
  }

  await Promise.all(tables);

  return NextResponse.json({ created: tableCount }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { tableId } = await req.json();

  await prisma.restaurantTable.delete({ where: { id: tableId, restaurantId: id } });

  return NextResponse.json({ success: true });
}

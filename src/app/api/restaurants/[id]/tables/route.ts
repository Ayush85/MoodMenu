import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withApiLogging } from "@/lib/api-handler";

async function verifyAccess(restaurantId: string, userId: string, actorType?: string) {
  if (actorType === "STAFF") {
    const staff = await prisma.restaurantStaff.findFirst({
      where: { id: userId, restaurantId, isActive: true },
    });
    return !!staff;
  }
  const restaurant = await prisma.restaurant.findFirst({
    where: { id: restaurantId, ownerId: userId },
  });
  return !!restaurant;
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
  if (!(await verifyAccess(id, session.user.id, session.user.actorType))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId: id },
    orderBy: { number: "asc" },
  });

  return NextResponse.json(tables);
});

export const POST = withApiLogging(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.actorType === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
});

export const DELETE = withApiLogging(async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.actorType === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const restaurant = await prisma.restaurant.findFirst({
    where: { id, ownerId: session.user.id },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { tableId } = await req.json();
  await prisma.restaurantTable.delete({ where: { id: tableId, restaurantId: id } });

  return NextResponse.json({ success: true });
});

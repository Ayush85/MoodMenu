import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withApiLogging } from "@/lib/api-handler";

export const POST = withApiLogging(async function POST(
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

  const { name, description, price, image, tags, categoryId } = await req.json();

  if (!name || price === undefined || !categoryId) {
    return NextResponse.json(
      { error: "Name, price, and categoryId are required" },
      { status: 400 }
    );
  }

  const maxOrder = await prisma.menuItem.aggregate({
    where: { categoryId },
    _max: { order: true },
  });

  const item = await prisma.menuItem.create({
    data: {
      name,
      description: description || null,
      price: parseFloat(price),
      image: image || null,
      tags: tags || [],
      order: (maxOrder._max.order ?? -1) + 1,
      categoryId,
    },
  });

  return NextResponse.json(item, { status: 201 });
});

export const PATCH = withApiLogging(async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const restaurant = await prisma.restaurant.findFirst({
    where: { id, ownerId: session.user.id },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Reorder items: body.order = [{id, order}, ...]
  if (Array.isArray(body.order)) {
    await Promise.all(
      body.order.map(({ id: itemId, order }: { id: string; order: number }) =>
        prisma.menuItem.update({ where: { id: itemId }, data: { order } })
      )
    );
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
});

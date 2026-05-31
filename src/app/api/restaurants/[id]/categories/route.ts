import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const maxOrder = await prisma.category.aggregate({
    where: { restaurantId: id },
    _max: { order: true },
  });

  const category = await prisma.category.create({
    data: {
      name,
      order: (maxOrder._max.order ?? -1) + 1,
      restaurantId: id,
    },
  });

  return NextResponse.json(category, { status: 201 });
}

export async function PATCH(
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

  // Rename a single category
  if (body.categoryId && body.name !== undefined) {
    const updated = await prisma.category.update({
      where: { id: body.categoryId },
      data: { name: body.name.trim() },
    });
    return NextResponse.json(updated);
  }

  // Reorder categories: body.order = [{id, order}, ...]
  if (Array.isArray(body.order)) {
    await Promise.all(
      body.order.map(({ id: catId, order }: { id: string; order: number }) =>
        prisma.category.update({ where: { id: catId }, data: { order } })
      )
    );
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
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
  const { categoryId } = await req.json();

  const restaurant = await prisma.restaurant.findFirst({
    where: { id, ownerId: session.user.id },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.category.delete({ where: { id: categoryId } });

  return NextResponse.json({ success: true });
}

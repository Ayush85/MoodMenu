import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.actorType === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, itemId } = await params;
  const restaurant = await prisma.restaurant.findFirst({
    where: { id, ownerId: session.user.id },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify item belongs to this restaurant
  const item = await prisma.menuItem.findFirst({
    where: { id: itemId, category: { restaurantId: id } },
  });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const data = await req.json();

  // If moving to another category, validate the target belongs to this restaurant
  if (data.categoryId) {
    const targetCat = await prisma.category.findFirst({
      where: { id: data.categoryId, restaurantId: id },
    });
    if (!targetCat) {
      return NextResponse.json({ error: "Target category not found" }, { status: 404 });
    }
  }

  const updated = await prisma.menuItem.update({
    where: { id: itemId },
    data: {
      name: data.name,
      description: data.description,
      price: data.price !== undefined ? parseFloat(data.price) : undefined,
      image: data.image,
      tags: data.tags,
      isAvailable: data.isAvailable,
      isSpecial: data.isSpecial,
      categoryId: data.categoryId,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.actorType === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, itemId } = await params;
  const restaurant = await prisma.restaurant.findFirst({
    where: { id, ownerId: session.user.id },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify item belongs to this restaurant
  const item = await prisma.menuItem.findFirst({
    where: { id: itemId, category: { restaurantId: id } },
  });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  await prisma.menuItem.delete({ where: { id: itemId } });

  return NextResponse.json({ success: true });
}

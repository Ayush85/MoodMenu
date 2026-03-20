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

  const { name, description, price, image, tags, categoryId } = await req.json();

  if (!name || price === undefined || !categoryId) {
    return NextResponse.json(
      { error: "Name, price, and categoryId are required" },
      { status: 400 }
    );
  }

  const item = await prisma.menuItem.create({
    data: {
      name,
      description: description || null,
      price: parseFloat(price),
      image: image || null,
      tags: tags || [],
      categoryId,
    },
  });

  return NextResponse.json(item, { status: 201 });
}

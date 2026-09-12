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

  const { name, condition, theme, featuredTags, priority } = await req.json();

  if (typeof name === "string" && name.trim()) {
    const existing = await prisma.moodRule.findFirst({
      where: { restaurantId: id, name: { equals: name.trim(), mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json({ error: `A mood rule named "${name}" already exists` }, { status: 409 });
    }
  }

  const rule = await prisma.moodRule.create({
    data: {
      name,
      condition: condition || {},
      theme: theme || {},
      featuredTags: featuredTags || [],
      priority: priority || 0,
      restaurantId: id,
    },
  });

  return NextResponse.json(rule, { status: 201 });
});

export const DELETE = withApiLogging(async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { ruleId } = await req.json();

  const restaurant = await prisma.restaurant.findFirst({
    where: { id, ownerId: session.user.id },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.moodRule.delete({ where: { id: ruleId } });

  return NextResponse.json({ success: true });
});

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withApiLogging } from "@/lib/api-handler";

export const GET = withApiLogging(async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const restaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "desc" },
    // isSuspended is a scalar column, already included by default via
    // `include` (which only adds relations) — no extra select needed.
    include: {
      owner: { select: { name: true, email: true } },
      _count: { select: { categories: true, moodRules: true } },
      categories: {
        include: { _count: { select: { items: true } } },
      },
    },
  });

  return NextResponse.json(restaurants);
});

export const PATCH = withApiLogging(async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { restaurantId, isSuspended } = await req.json();
  if (typeof restaurantId !== "string" || typeof isSuspended !== "boolean") {
    return NextResponse.json({ error: "restaurantId and isSuspended are required" }, { status: 400 });
  }

  const restaurant = await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { isSuspended },
  });

  return NextResponse.json(restaurant);
});

export const DELETE = withApiLogging(async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { restaurantId } = await req.json();
  await prisma.restaurant.delete({ where: { id: restaurantId } });

  return NextResponse.json({ success: true });
});

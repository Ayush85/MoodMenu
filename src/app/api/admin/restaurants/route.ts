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

export const DELETE = withApiLogging(async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { restaurantId } = await req.json();
  await prisma.restaurant.delete({ where: { id: restaurantId } });

  return NextResponse.json({ success: true });
});

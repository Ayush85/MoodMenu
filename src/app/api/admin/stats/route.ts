import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withApiLogging } from "@/lib/api-handler";

export const GET = withApiLogging(async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const onlineSince = new Date(Date.now() - 5 * 60 * 1000);

  const [totalUsers, totalRestaurants, totalMenuItems, totalCategories, onlineNow] =
    await Promise.all([
      prisma.user.count(),
      prisma.restaurant.count(),
      prisma.menuItem.count(),
      prisma.category.count(),
      prisma.user.count({ where: { lastActiveAt: { gt: onlineSince } } }),
    ]);

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const recentRestaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      owner: { select: { name: true, email: true } },
      _count: { select: { categories: true } },
    },
  });

  return NextResponse.json({
    stats: { totalUsers, totalRestaurants, totalMenuItems, totalCategories, onlineNow },
    recentUsers,
    recentRestaurants,
  });
});

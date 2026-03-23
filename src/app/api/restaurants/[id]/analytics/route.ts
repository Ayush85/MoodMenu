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
  const restaurant = await prisma.restaurant.findFirst({
    where: { id, ownerId: session.user.id },
    select: { id: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Scan counts
  const [scansToday, scansWeek, scansMonth, scansTotal] = await Promise.all([
    prisma.menuScan.count({ where: { restaurantId: id, createdAt: { gte: today } } }),
    prisma.menuScan.count({ where: { restaurantId: id, createdAt: { gte: weekAgo } } }),
    prisma.menuScan.count({ where: { restaurantId: id, createdAt: { gte: monthAgo } } }),
    prisma.menuScan.count({ where: { restaurantId: id } }),
  ]);

  // Scans per day (last 7 days)
  const dailyScans = await prisma.menuScan.groupBy({
    by: ["createdAt"],
    where: { restaurantId: id, createdAt: { gte: weekAgo } },
    _count: true,
  });

  // Aggregate by date
  const scansByDay: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    scansByDay[d.toISOString().split("T")[0]] = 0;
  }
  for (const row of dailyScans) {
    const day = new Date(row.createdAt).toISOString().split("T")[0];
    scansByDay[day] = (scansByDay[day] || 0) + row._count;
  }

  // Peak hours (last 30 days)
  const allScans = await prisma.menuScan.findMany({
    where: { restaurantId: id, createdAt: { gte: monthAgo } },
    select: { createdAt: true },
  });

  const hourCounts = new Array(24).fill(0);
  for (const scan of allScans) {
    hourCounts[new Date(scan.createdAt).getHours()]++;
  }

  // Popular tables
  const tableScans = await prisma.menuScan.groupBy({
    by: ["tableNumber"],
    where: { restaurantId: id, tableNumber: { not: null }, createdAt: { gte: monthAgo } },
    _count: true,
    orderBy: { _count: { tableNumber: "desc" } },
    take: 5,
  });

  // Waiter call stats
  const [callsToday, callsWeek] = await Promise.all([
    prisma.waiterCall.count({ where: { restaurantId: id, createdAt: { gte: today } } }),
    prisma.waiterCall.count({ where: { restaurantId: id, createdAt: { gte: weekAgo } } }),
  ]);

  // Orders stats
  const [ordersToday, revenueToday] = await Promise.all([
    prisma.orderTicket.count({ where: { restaurantId: id, createdAt: { gte: today } } }),
    prisma.orderTicket.aggregate({
      where: { restaurantId: id, status: "PAID", createdAt: { gte: today } },
      _sum: { total: true },
    }),
  ]);

  // Popular items (by order count, last 30 days)
  const popularItems = await prisma.orderLine.groupBy({
    by: ["itemName"],
    where: {
      order: { restaurantId: id, createdAt: { gte: monthAgo } },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 10,
  });

  return NextResponse.json({
    scans: { today: scansToday, week: scansWeek, month: scansMonth, total: scansTotal },
    scansByDay: Object.entries(scansByDay).sort().map(([date, count]) => ({ date, count })),
    peakHours: hourCounts,
    popularTables: tableScans.map((t) => ({ table: t.tableNumber, scans: t._count })),
    calls: { today: callsToday, week: callsWeek },
    orders: { today: ordersToday, revenueToday: revenueToday._sum.total || 0 },
    popularItems: popularItems.map((p) => ({ name: p.itemName, quantity: p._sum.quantity || 0 })),
  });
}

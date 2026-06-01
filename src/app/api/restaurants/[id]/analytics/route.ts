import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const owner = await prisma.restaurant.findFirst({
    where: { id, ownerId: session.user.id },
    select: { id: true },
  });
  if (!owner) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [allOrders, orderLines, allExpenses] = await Promise.all([
    prisma.orderTicket.findMany({
      where: { restaurantId: id },
      select: { id: true, status: true, total: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.orderLine.findMany({
      where: { order: { restaurantId: id } },
      select: { itemName: true, quantity: true, unitPrice: true, lineTotal: true },
    }),
    prisma.expense.findMany({
      where: { restaurantId: id },
      select: { amount: true, category: true, date: true },
    }),
  ]);

  const paidOrders = allOrders.filter((o) => o.status === "PAID");

  const revenue = {
    total: paidOrders.reduce((s, o) => s + o.total, 0),
    today: paidOrders.filter((o) => o.createdAt >= todayStart).reduce((s, o) => s + o.total, 0),
    week: paidOrders.filter((o) => o.createdAt >= weekStart).reduce((s, o) => s + o.total, 0),
    month: paidOrders.filter((o) => o.createdAt >= monthStart).reduce((s, o) => s + o.total, 0),
  };

  const orderCounts = {
    total: allOrders.length,
    today: allOrders.filter((o) => o.createdAt >= todayStart).length,
    week: allOrders.filter((o) => o.createdAt >= weekStart).length,
    byStatus: {
      NEW: allOrders.filter((o) => o.status === "NEW").length,
      PREPARING: allOrders.filter((o) => o.status === "PREPARING").length,
      SERVED: allOrders.filter((o) => o.status === "SERVED").length,
      PAID: allOrders.filter((o) => o.status === "PAID").length,
      CANCELED: allOrders.filter((o) => o.status === "CANCELED").length,
    },
  };

  // Top items by quantity sold
  const itemMap: Record<string, { quantity: number; revenue: number }> = {};
  for (const line of orderLines) {
    if (!itemMap[line.itemName]) itemMap[line.itemName] = { quantity: 0, revenue: 0 };
    itemMap[line.itemName].quantity += line.quantity;
    itemMap[line.itemName].revenue += line.lineTotal;
  }
  const topItems = Object.entries(itemMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  // Daily revenue for last 14 days
  const dailyRevenue: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(todayStart);
    day.setDate(day.getDate() - i);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayOrders = paidOrders.filter((o) => o.createdAt >= day && o.createdAt < nextDay);
    const allDayOrders = allOrders.filter((o) => o.createdAt >= day && o.createdAt < nextDay);
    dailyRevenue.push({
      date: day.toISOString().split("T")[0],
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      orders: allDayOrders.length,
    });
  }

  // Peak hours (0-23)
  const hourMap: Record<number, number> = {};
  for (const o of allOrders) {
    const h = o.createdAt.getHours();
    hourMap[h] = (hourMap[h] || 0) + 1;
  }
  const peakHours = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    orders: hourMap[h] || 0,
  }));

  const avgOrderValue = paidOrders.length > 0 ? revenue.total / paidOrders.length : 0;

  const expenses = {
    total: allExpenses.reduce((s, e) => s + e.amount, 0),
    today: allExpenses.filter((e) => e.date >= todayStart).reduce((s, e) => s + e.amount, 0),
    week: allExpenses.filter((e) => e.date >= weekStart).reduce((s, e) => s + e.amount, 0),
    month: allExpenses.filter((e) => e.date >= monthStart).reduce((s, e) => s + e.amount, 0),
    byCategory: allExpenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {}),
  };

  // Daily expenses for last 14 days
  const dailyExpenseMap: Record<string, number> = {};
  for (const e of allExpenses) {
    const key = e.date.toISOString().split("T")[0];
    dailyExpenseMap[key] = (dailyExpenseMap[key] || 0) + e.amount;
  }

  return NextResponse.json({
    revenue,
    expenses,
    profit: {
      today: revenue.today - expenses.today,
      week: revenue.week - expenses.week,
      month: revenue.month - expenses.month,
      total: revenue.total - expenses.total,
    },
    orders: orderCounts,
    topItems,
    dailyRevenue: dailyRevenue.map((d) => ({ ...d, expenses: dailyExpenseMap[d.date] || 0 })),
    peakHours,
    avgOrderValue,
  });
}

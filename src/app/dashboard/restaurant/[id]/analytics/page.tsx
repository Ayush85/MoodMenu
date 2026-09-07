"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SkeletonLine, SkeletonBlock } from "@/components/Skeleton";

interface AnalyticsData {
  revenue: { total: number; today: number; week: number; month: number };
  expenses: { total: number; today: number; week: number; month: number; byCategory: Record<string, number> };
  profit: { today: number; week: number; month: number; total: number };
  orders: {
    total: number;
    today: number;
    week: number;
    byStatus: Record<string, number>;
  };
  topItems: { name: string; quantity: number; revenue: number }[];
  dailyRevenue: { date: string; revenue: number; orders: number; expenses: number }[];
  peakHours: { hour: number; orders: number }[];
  avgOrderValue: number;
}

function fmt(n: number) {
  return `Rs. ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtHour(h: number) {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  NEW:       { label: "New",       color: "text-blue-600",   bg: "bg-blue-500" },
  PREPARING: { label: "Preparing", color: "text-amber-600",  bg: "bg-amber-500" },
  SERVED:    { label: "Served",    color: "text-violet-600", bg: "bg-violet-500" },
  PAID:      { label: "Paid",      color: "text-emerald-600",bg: "bg-emerald-500" },
  CANCELED:  { label: "Canceled",  color: "text-red-500",    bg: "bg-red-400" },
};

export default function AnalyticsPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7" | "14">("7");

  useEffect(() => {
    fetch(`/api/restaurants/${id}/analytics`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="page-shell">
        <div className="mb-8"><SkeletonLine width="192px" height="32px" /></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => <SkeletonBlock key={i} height="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SkeletonBlock height="h-64" className="lg:col-span-2" />
          <SkeletonBlock height="h-64" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const chartDays = data.dailyRevenue.slice(range === "7" ? -7 : -14);
  const maxRevenue = Math.max(...chartDays.map(d => d.revenue), 1);
  const maxOrders = Math.max(...data.peakHours.map(h => h.orders), 1);
  const maxItem = Math.max(...data.topItems.map(i => i.quantity), 1);
  const totalOrdersForStatus = Object.values(data.orders.byStatus).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="page-shell animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle mt-1">Revenue, orders, and performance insights</p>
        </div>
        <div className="tab-bar">
          {(["7", "14"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`tab-btn ${range === r ? "tab-btn-active" : ""}`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Revenue Today",
            value: fmt(data.revenue.today),
            sub: `${fmt(data.revenue.week)} this week`,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            color: "text-emerald-600", bg: "bg-emerald-50",
          },
          {
            label: "Orders Today",
            value: data.orders.today,
            sub: `${data.orders.week} this week`,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            ),
            color: "text-blue-600", bg: "bg-blue-50",
          },
          {
            label: "Avg Order Value",
            value: fmt(data.avgOrderValue),
            sub: `${data.orders.total} total orders`,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ),
            color: "text-violet-600", bg: "bg-violet-50",
          },
          {
            label: "Total Revenue",
            value: fmt(data.revenue.total),
            sub: `${fmt(data.revenue.month)} this month`,
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ),
            color: "text-orange-600", bg: "bg-orange-50",
          },
        ].map((card) => (
          <div key={card.label} className="stat-card">
            <div className={`stat-card-icon ${card.bg} ${card.color}`}>
              {card.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{card.label}</p>
              <p className={`text-xl sm:text-2xl font-extrabold ${card.color} mt-0.5 leading-tight`}>{card.value}</p>
              <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Profit summary row */}
      <div className="surface-card p-5 mb-6 border-l-4 border-emerald-400">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Today's Profit", revenue: data.revenue.today, expense: data.expenses.today, profit: data.profit.today },
            { label: "This Week",      revenue: data.revenue.week,  expense: data.expenses.week,  profit: data.profit.week },
            { label: "This Month",     revenue: data.revenue.month, expense: data.expenses.month, profit: data.profit.month },
            { label: "All Time",       revenue: data.revenue.total, expense: data.expenses.total, profit: data.profit.total },
          ].map((row) => (
            <div key={row.label}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">{row.label}</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">Revenue</span>
                  <span className="text-[11px] font-semibold text-emerald-600">{fmt(row.revenue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">Expenses</span>
                  <span className="text-[11px] font-semibold text-red-500">− {fmt(row.expense)}</span>
                </div>
                <div className="h-px bg-gray-100 my-1" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-700">Profit</span>
                  <span className={`text-sm font-extrabold ${row.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {row.profit >= 0 ? "" : "−"}{fmt(Math.abs(row.profit))}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Revenue chart + Status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Daily revenue bar chart */}
        <div className="surface-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Revenue vs Expenses</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-orange-400 inline-block"/>Revenue</span>
                <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-red-300 inline-block"/>Expenses</span>
              </div>
            </div>
            <span className="text-xs text-gray-400">Last {range} days</span>
          </div>
          <div className="flex items-end gap-1.5 h-40">
            {chartDays.map((day) => {
              const pct = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-10">
                    <div className="bg-gray-900 text-white text-[10px] rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                      <p className="font-semibold">{fmtDate(day.date)}</p>
                      <p className="text-emerald-400">↑ {fmt(day.revenue)}</p>
                      <p className="text-red-400">↓ {fmt(day.expenses)}</p>
                      <p className="text-gray-400">{day.orders} orders</p>
                    </div>
                    <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
                  </div>
                  {/* Stacked: expense bar on top of revenue bar */}
                  <div className="w-full flex flex-col justify-end" style={{ height: "100%" }}>
                    {day.expenses > 0 && (
                      <div className="w-full rounded-t-sm bg-red-300 min-h-0.5"
                        style={{ height: `${Math.max(maxRevenue > 0 ? (day.expenses / maxRevenue) * 100 : 0, 1.5)}%` }} />
                    )}
                    <div className="w-full bg-linear-to-t from-orange-500 to-rose-400 transition-all duration-300 min-h-0.75"
                      style={{ height: `${Math.max(pct, 2)}%`, borderRadius: day.expenses > 0 ? "0 0 6px 6px" : "6px 6px 0 0" }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-400 font-medium">{fmtDate(day.date).split(" ")[1]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order status breakdown */}
        <div className="surface-card p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-5">Orders by Status</h2>
          <div className="space-y-3">
            {Object.entries(data.orders.byStatus).map(([status, count]) => {
              const meta = STATUS_META[status];
              const pct = (count / totalOrdersForStatus) * 100;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                    <span className="text-xs text-gray-500 font-medium">{count}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${meta.bg} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-gray-50">
            <p className="text-xs text-gray-400">Total orders</p>
            <p className="text-2xl font-extrabold text-gray-900">{data.orders.total}</p>
          </div>
        </div>
      </div>

      {/* Row 3: Top items + Peak hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top items */}
        <div className="surface-card p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-5">Top Menu Items</h2>
          {data.topItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No orders yet</div>
          ) : (
            <div className="space-y-3">
              {data.topItems.map((item, i) => {
                const pct = (item.quantity / maxItem) * 100;
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className={`text-xs font-bold w-5 shrink-0 ${i < 3 ? "text-orange-500" : "text-gray-300"}`}>
                      #{i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-800 truncate">{item.name}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-[10px] text-gray-400">{item.quantity}×</span>
                          <span className="text-[10px] font-bold text-emerald-600">{fmt(item.revenue)}</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-orange-400 to-rose-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Peak hours heatmap */}
        <div className="surface-card p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-5">Peak Hours</h2>
          <div className="grid grid-cols-12 gap-1">
            {data.peakHours.map(({ hour, orders }) => {
              const intensity = maxOrders > 0 ? orders / maxOrders : 0;
              const opacity = intensity < 0.1 ? 5 : Math.round(intensity * 90 + 10);
              return (
                <div key={hour} className="group relative">
                  <div
                    className="h-8 rounded-md bg-orange-500 transition-all cursor-default"
                    style={{ opacity: `${Math.min(opacity, 100)}%` }}
                  />
                  <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block pointer-events-none z-10">
                    <div className="bg-gray-900 text-white text-[10px] rounded-lg px-2 py-1 whitespace-nowrap shadow-lg text-center">
                      <p className="font-semibold">{fmtHour(hour)}</p>
                      <p>{orders} orders</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-gray-400">12am</span>
            <span className="text-[10px] text-gray-400">6am</span>
            <span className="text-[10px] text-gray-400">12pm</span>
            <span className="text-[10px] text-gray-400">6pm</span>
            <span className="text-[10px] text-gray-400">11pm</span>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[10, 30, 60, 100].map((o) => (
                <div key={o} className="w-4 h-3 rounded-sm bg-orange-500" style={{ opacity: `${o}%` }} />
              ))}
            </div>
            <span className="text-[10px] text-gray-400">Low → High activity</span>
          </div>
        </div>
      </div>
    </div>
  );
}

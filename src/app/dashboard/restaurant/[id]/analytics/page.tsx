"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Analytics {
  scans: { today: number; week: number; month: number; total: number };
  scansByDay: { date: string; count: number }[];
  peakHours: number[];
  popularTables: { table: number; scans: number }[];
  calls: { today: number; week: number };
  orders: { today: number; revenueToday: number };
  popularItems: { name: string; quantity: number }[];
}

export default function AnalyticsPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/restaurants/${id}/analytics`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page-shell max-w-5xl">
        <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="surface-card h-24 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!data) return <div className="page-shell">Failed to load analytics</div>;

  const maxHourCount = Math.max(...data.peakHours, 1);
  const maxDayCount = Math.max(...data.scansByDay.map((d) => d.count), 1);

  return (
    <div className="page-shell max-w-5xl animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <span className="text-2xl">📊</span> Analytics
          </h1>
          <p className="page-subtitle mt-1">QR scans, orders, and insights</p>
        </div>
        <Link href={`/dashboard/restaurant/${id}/menu`} className="btn-soft !text-sm">
          ← Back to Menu
        </Link>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Scans Today", value: data.scans.today, color: "text-blue-600", bg: "border-blue-200 bg-blue-50" },
          { label: "Scans This Week", value: data.scans.week, color: "text-violet-600", bg: "border-violet-200 bg-violet-50" },
          { label: "Orders Today", value: data.orders.today, color: "text-orange-600", bg: "border-orange-200 bg-orange-50" },
          { label: "Revenue Today", value: `Rs. ${data.orders.revenueToday.toLocaleString("en-IN")}`, color: "text-emerald-600", bg: "border-emerald-200 bg-emerald-50" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">{s.label}</p>
            <p className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Daily Scans Chart */}
        <div className="surface-card p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Daily Scans (Last 7 Days)</h2>
          <div className="flex items-end gap-2 h-32">
            {data.scansByDay.map((day) => {
              const height = maxDayCount > 0 ? (day.count / maxDayCount) * 100 : 0;
              const weekday = new Date(day.date + "T00:00:00").toLocaleDateString("en", { weekday: "short" });
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-gray-700">{day.count}</span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-blue-400 transition-all"
                    style={{ height: `${Math.max(height, 4)}%`, minHeight: "4px" }}
                  />
                  <span className="text-[9px] text-gray-400">{weekday}</span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-3 text-[10px] text-gray-400">
            <span>Total: {data.scans.total} scans</span>
            <span>This month: {data.scans.month}</span>
          </div>
        </div>

        {/* Peak Hours */}
        <div className="surface-card p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Peak Hours (Last 30 Days)</h2>
          <div className="flex items-end gap-px h-32">
            {data.peakHours.map((count, hour) => {
              const height = maxHourCount > 0 ? (count / maxHourCount) * 100 : 0;
              const isActive = count > maxHourCount * 0.6;
              return (
                <div key={hour} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className={`w-full rounded-t transition-all ${isActive ? "bg-orange-500" : "bg-gray-200"}`}
                    style={{ height: `${Math.max(height, 2)}%`, minHeight: "2px" }}
                    title={`${hour}:00 — ${count} scans`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[9px] text-gray-400">
            <span>12am</span>
            <span>6am</span>
            <span>12pm</span>
            <span>6pm</span>
            <span>12am</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            Busiest: {data.peakHours.indexOf(Math.max(...data.peakHours))}:00 ({Math.max(...data.peakHours)} scans)
          </p>
        </div>

        {/* Popular Items */}
        <div className="surface-card p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Popular Items (By Orders)</h2>
          {data.popularItems.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No order data yet</p>
          ) : (
            <div className="space-y-2.5">
              {data.popularItems.map((item, i) => {
                const maxQty = data.popularItems[0]?.quantity || 1;
                const width = (item.quantity / maxQty) * 100;
                return (
                  <div key={item.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-800 truncate">
                        {i + 1}. {item.name}
                      </span>
                      <span className="text-gray-500 shrink-0 ml-2">{item.quantity}x</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-400 to-rose-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Popular Tables + Waiter Calls */}
        <div className="space-y-5">
          <div className="surface-card p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Most Active Tables</h2>
            {data.popularTables.length === 0 ? (
              <p className="text-sm text-gray-400 py-2 text-center">No table data yet</p>
            ) : (
              <div className="flex gap-3">
                {data.popularTables.map((t) => (
                  <div key={t.table} className="flex-1 text-center p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <p className="text-2xl font-extrabold text-gray-900">{t.table}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{t.scans} scans</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface-card p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Waiter Calls</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-red-200 bg-red-50">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500">Today</p>
                <p className="text-2xl font-extrabold text-red-700 mt-1">{data.calls.today}</p>
              </div>
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500">This Week</p>
                <p className="text-2xl font-extrabold text-amber-700 mt-1">{data.calls.week}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PartyPopper, Rocket, Store, ClipboardList, Wifi, Smartphone } from "lucide-react";
import { SkeletonLine, SkeletonBlock } from "@/components/Skeleton";

interface Restaurant {
  id: string;
  name: string;
  city: string;
  slug: string;
  categories: { items: unknown[] }[];
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const isStaff = session?.user?.actorType === "STAFF";

  useEffect(() => {
    fetch("/api/restaurants")
      .then((res) => res.json())
      .then((data) => {
        setRestaurants(data);
        setLoading(false);
      });
  }, []);

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  const totalItems = restaurants.reduce(
    (a, r) => a + r.categories.reduce((b, c) => b + c.items.length, 0),
    0
  );
  const totalCategories = restaurants.reduce((a, r) => a + r.categories.length, 0);

  if (loading) {
    return (
      <div className="page-shell">
        <div className="mb-8 space-y-2">
          <SkeletonLine width="224px" height="32px" />
          <SkeletonLine width="144px" height="16px" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[1, 2, 3, 4].map((i) => <SkeletonBlock key={i} height="h-20" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => <SkeletonBlock key={i} height="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell animate-fade-in">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            {getGreeting()},{" "}
            <span className="gradient-text">
              {session?.user?.name?.split(" ")[0] || "there"}
            </span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {restaurants.length > 0
              ? `Managing ${restaurants.length} restaurant${restaurants.length !== 1 ? "s" : ""} · ${totalItems} menu items`
              : "Let's get your first restaurant set up"}
          </p>
        </div>
        {!isStaff && (
          <Link href="/dashboard/restaurant/new" className="btn-primary text-sm! px-4! py-2.5! shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Restaurant
          </Link>
        )}
      </div>

      {/* Stats row */}
      {restaurants.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            {
              label: "Restaurants",
              value: restaurants.length,
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              ),
              color: "text-orange-600",
              bg: "bg-orange-50",
            },
            {
              label: "Menu Items",
              value: totalItems,
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              ),
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "Categories",
              value: totalCategories,
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
              ),
              color: "text-violet-600",
              bg: "bg-violet-50",
            },
            {
              label: "Active",
              value: restaurants.length,
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
          ].map((s) => (
            <div key={s.label} className="surface-card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center ${s.color} shrink-0`}>
                {s.icon}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</p>
                <p className={`text-xl font-extrabold ${s.color} leading-tight`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {restaurants.length === 0 ? (
        <div className="surface-card p-8 sm:p-12">
          {isStaff ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <PartyPopper className="w-6 h-6 text-gray-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome!</h2>
              <p className="text-gray-500 text-sm">No restaurant is assigned to your staff account yet. Ask your manager to add you.</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-10">
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-orange-500 via-rose-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
                  <Rocket className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Set up your first restaurant</h2>
                <p className="text-gray-500 text-sm">Go live in minutes — follow these 4 steps</p>
              </div>

              <div className="max-w-lg mx-auto space-y-3">
                {[
                  {
                    step: "1",
                    icon: <Store className="w-4 h-4" />,
                    title: "Create your restaurant",
                    desc: "Add name, city, and a unique URL slug",
                    href: "/dashboard/restaurant/new",
                    btn: "Create Restaurant",
                    active: true,
                  },
                  { step: "2", icon: <ClipboardList className="w-4 h-4" />, title: "Add your menu", desc: "Create categories and add items with photos & prices", href: null, btn: null, active: false },
                  { step: "3", icon: <Wifi className="w-4 h-4" />, title: "Set up WiFi & tables", desc: "Configure WiFi and add table numbers", href: null, btn: null, active: false },
                  { step: "4", icon: <Smartphone className="w-4 h-4" />, title: "Print QR codes", desc: "Generate and print QR tent cards for tables", href: null, btn: null, active: false },
                ].map((item, i) => (
                  <div
                    key={item.step}
                    className={`flex gap-4 p-4 rounded-2xl border transition ${
                      item.active
                        ? "bg-orange-50 border-orange-200"
                        : "bg-gray-50 border-gray-100 opacity-50"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base ${
                        item.active ? "bg-linear-to-br from-orange-500 to-rose-500 text-white shadow-sm" : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {i === 0 ? item.step : item.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-sm">{item.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      {item.href && (
                        <Link href={item.href} className="btn-primary text-xs! px-4! py-2! mt-3 inline-flex">
                          {item.btn}
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800">Your Restaurants</h2>
            <span className="text-xs text-gray-400">{restaurants.length} total</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {restaurants.map((r, i) => {
              const itemCount = r.categories.reduce((acc, cat) => acc + cat.items.length, 0);
              return (
                <Link
                  key={r.id}
                  href={`/dashboard/restaurant/${r.id}/menu`}
                  className={`surface-card p-5 group hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up stagger-${Math.min(i + 1, 5)}`}
                >
                  {/* Top bar */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm shadow-orange-200/50">
                      {r.name[0].toUpperCase()}
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Active
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 group-hover:text-orange-600 transition-colors leading-tight">
                    {r.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {r.city}
                  </p>

                  <div className="flex items-center gap-2 mt-4">
                    <span className="text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg">
                      {r.categories.length} categories
                    </span>
                    <span className="text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-lg">
                      {itemCount} items
                    </span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-mono">/menu/{r.slug}</span>
                    <span className="text-[11px] font-semibold text-orange-500 group-hover:text-orange-600 transition-colors flex items-center gap-1">
                      Manage
                      <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </Link>
              );
            })}

            {/* Add restaurant card */}
            {!isStaff && (
              <Link
                href="/dashboard/restaurant/new"
                className="surface-card p-5 border-dashed border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50/30 transition-all duration-200 flex flex-col items-center justify-center gap-3 text-center min-h-40 group"
              >
                <div className="w-10 h-10 rounded-xl border-2 border-dashed border-gray-300 group-hover:border-orange-400 flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 group-hover:text-orange-600 transition-colors">Add Restaurant</p>
                  <p className="text-xs text-gray-400 mt-0.5">Set up a new location</p>
                </div>
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}

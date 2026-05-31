"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

interface RestaurantOption {
  id: string;
  name: string;
  slug: string;
}

const RESTAURANT_NAV = [
  {
    key: "menu",
    label: "Menu",
    suffix: "/menu",
    icon: (
      <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    key: "tables",
    label: "Tables & WiFi",
    suffix: "/tables",
    icon: (
      <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M3 6h18M3 14h18M3 18h18" />
      </svg>
    ),
  },
  {
    key: "staff",
    label: "Staff",
    suffix: "/staff",
    icon: (
      <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    key: "mood",
    label: "Mood Rules",
    suffix: "/mood",
    icon: (
      <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    key: "qr",
    label: "QR Codes",
    suffix: "/qr",
    icon: (
      <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const isStaff = session?.user?.actorType === "STAFF";
  const primaryRestaurantId = session?.user?.restaurantId || session?.user?.restaurantIds?.[0];

  useEffect(() => {
    fetch("/api/restaurants")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data)
          ? data.map((r) => ({ id: r.id as string, name: r.name as string, slug: r.slug as string }))
          : [];
        setRestaurants(list);
      })
      .catch(() => setRestaurants([]));
  }, []);

  const currentRestaurantId = useMemo(() => {
    const match = pathname.match(/\/dashboard\/restaurant\/([^/]+)/);
    if (match?.[1]) return match[1];
    return primaryRestaurantId || "";
  }, [pathname, primaryRestaurantId]);

  const insideRestaurant = useMemo(
    () => /\/dashboard\/restaurant\/[^/]+/.test(pathname),
    [pathname]
  );

  const currentRestaurant = restaurants.find((r) => r.id === currentRestaurantId);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const close = () => setMobileOpen(false);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2.5 group" onClick={close}>
          <img
            src="/logo.png"
            alt="MoodMenu"
            className="w-8 h-8 rounded-xl object-cover transition-all group-hover:scale-105"
          />
          <div>
            <span className="text-[15px] font-bold text-gray-900 block leading-none">MoodMenu</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-0.5 block">
              {isStaff ? "Staff Portal" : "Dashboard"}
            </span>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {/* Restaurant context navigation */}
        {insideRestaurant && !isStaff && (
          <div>
            {/* Restaurant switcher */}
            {restaurants.length > 1 ? (
              <div className="mb-3">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 mb-1.5">
                  Restaurant
                </label>
                <select
                  value={currentRestaurantId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                    const nextId = e.target.value;
                    if (!nextId) return;
                    router.push(`/dashboard/restaurant/${nextId}/menu`);
                  }}
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
                >
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            ) : currentRestaurant ? (
              <div className="flex items-center gap-2.5 px-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {currentRestaurant.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{currentRestaurant.name}</p>
                  <p className="text-[10px] text-gray-400">Current restaurant</p>
                </div>
              </div>
            ) : null}

            {/* Restaurant sub-nav */}
            <nav className="space-y-0.5">
              {RESTAURANT_NAV.map((item) => {
                const href = `/dashboard/restaurant/${currentRestaurantId}${item.suffix}`;
                const active = pathname === href || pathname.startsWith(href);
                return (
                  <Link
                    key={item.key}
                    href={href}
                    onClick={close}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group text-sm ${
                      active
                        ? "bg-orange-50 text-orange-700 font-semibold"
                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-50 font-medium"
                    }`}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-orange-500 to-rose-500" />
                    )}
                    <span className={active ? "text-orange-500" : "text-gray-400 group-hover:text-gray-500"}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}

              {/* View Menu external link */}
              {(() => {
                const slug = restaurants.find((r) => r.id === currentRestaurantId)?.slug;
                return slug ? (
                  <a
                    href={`/menu/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={close}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-50 font-medium group"
                  >
                <span className="text-gray-400 group-hover:text-gray-500">
                  <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </span>
                    View Live Menu
                  </a>
                ) : null;
              })()}
            </nav>

            {/* Divider */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link
                href="/dashboard"
                onClick={close}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium group ${
                  pathname === "/dashboard"
                    ? "bg-orange-50 text-orange-700"
                    : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                All Restaurants
              </Link>
            </div>
          </div>
        )}

        {/* Staff inside restaurant */}
        {insideRestaurant && isStaff && (
          <nav className="space-y-0.5">
            <Link
              href={`/dashboard/restaurant/${currentRestaurantId}/staff`}
              onClick={close}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium group ${
                pathname.includes("/staff") ? "bg-orange-50 text-orange-700" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Staff Panel
            </Link>
          </nav>
        )}

        {/* Default nav — when NOT inside a restaurant */}
        {!insideRestaurant && (
          <nav className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 mb-1.5">Navigation</p>
            <Link
              href="/dashboard"
              onClick={close}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium group ${
                pathname === "/dashboard"
                  ? "bg-orange-50 text-orange-700"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {pathname === "/dashboard" && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-orange-500 to-rose-500" />
              )}
              <span className={pathname === "/dashboard" ? "text-orange-500" : "text-gray-400 group-hover:text-gray-500"}>
                <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </span>
              Overview
            </Link>

            {!isStaff && (
              <Link
                href="/dashboard/restaurant/new"
                onClick={close}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium group ${
                  pathname === "/dashboard/restaurant/new"
                    ? "bg-orange-50 text-orange-700"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                {pathname === "/dashboard/restaurant/new" && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-orange-500 to-rose-500" />
                )}
                <span className={pathname === "/dashboard/restaurant/new" ? "text-orange-500" : "text-gray-400 group-hover:text-gray-500"}>
                  <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
                Add Restaurant
              </Link>
            )}
          </nav>
        )}
      </div>

      {/* Bottom — user + admin + signout */}
      <div className="px-3 py-3 border-t border-gray-100 space-y-1">
        {isSuperAdmin && (
          <Link
            href="/admin"
            onClick={close}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 transition text-sm font-medium"
          >
            <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Super Admin
          </Link>
        )}

        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 via-rose-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {session?.user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate leading-tight">
              {session?.user?.name || "User"}
            </p>
            <p className="text-[10px] text-gray-400 truncate">{session?.user?.email || ""}</p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 transition w-full text-sm font-medium"
        >
          <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 px-4 h-14 flex items-center justify-between bg-white border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/logo.png" alt="MoodMenu" className="w-7 h-7 rounded-lg object-cover" />
          <span className="text-sm font-bold text-gray-900">MoodMenu</span>
        </Link>
        <div className="flex items-center gap-1">
          {isSuperAdmin && (
            <Link href="/admin" className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={close} />
          <aside className="fixed top-0 left-0 bottom-0 z-50 w-64 bg-white md:hidden animate-slide-in-right shadow-xl">
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:min-h-screen md:shrink-0 bg-white border-r border-gray-100">
        {sidebarContent}
      </aside>
    </>
  );
}

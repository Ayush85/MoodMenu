"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

interface RestaurantOption {
  id: string;
  name: string;
}

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
          ? data.map((r) => ({ id: r.id as string, name: r.name as string }))
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

  const links = isStaff
    ? [
        {
          href: "/dashboard",
          label: "Overview",
          icon: (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          href: primaryRestaurantId ? `/dashboard/restaurant/${primaryRestaurantId}/staff` : "/dashboard",
          label: "Staff Panel",
          icon: (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5V4H2v16h5m10 0v-8a2 2 0 00-2-2H9a2 2 0 00-2 2v8m10 0H7" />
            </svg>
          ),
        },
      ]
    : [
        {
          href: "/dashboard",
          label: "Overview",
          icon: (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          href: "/dashboard/restaurant/new",
          label: "Add Restaurant",
          icon: (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />
            </svg>
          ),
        },
      ];

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="mb-8">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <img
            src="/logo.png"
            alt="MoodMenu"
            className="w-9 h-9 rounded-xl object-cover transition-all group-hover:shadow-lg group-hover:shadow-orange-500/20 group-hover:scale-105"
          />
          <div>
            <span className="text-lg font-bold text-gray-900 block leading-tight">
              MoodMenu
            </span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
              {isStaff ? "Staff" : "Dashboard"}
            </span>
          </div>
        </Link>
      </div>

      {/* Restaurant switcher */}
      {restaurants.length > 1 && (
        <div className="mb-6">
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
            Restaurant
          </label>
          <select
            value={currentRestaurantId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              const nextId = e.target.value;
              if (!nextId) return;
              if (isStaff) {
                router.push(`/dashboard/restaurant/${nextId}/staff`);
                return;
              }
              router.push(`/dashboard/restaurant/${nextId}/menu`);
            }}
            className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
          >
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group ${
                active
                  ? "bg-orange-50 text-orange-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-orange-500 to-rose-500" />
              )}
              <span className={`transition-colors ${active ? "text-orange-500" : "text-gray-400 group-hover:text-gray-600"}`}>
                {link.icon}
              </span>
              <span className="text-sm font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-100 pt-4 mt-6 space-y-1">
        {isSuperAdmin && (
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 transition text-sm"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium">Super Admin</span>
          </Link>
        )}

        {/* User info */}
        <div className="px-3.5 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 via-rose-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {session?.user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {session?.user?.name || "User"}
            </p>
            <p className="text-[11px] text-gray-400 truncate">
              {session?.user?.email || ""}
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition w-full text-sm"
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="md:hidden sticky top-0 z-40 px-4 py-3 flex items-center justify-between bg-white"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/logo.png" alt="MoodMenu" className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-base font-bold text-gray-900">MoodMenu</span>
        </Link>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <Link href="/admin" className="w-9 h-9 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
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
          <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMobileOpen(false)} />
          <aside
            className="fixed top-0 left-0 bottom-0 z-50 w-72 p-5 flex flex-col md:hidden bg-white animate-slide-in-right"
            style={{ borderRight: "1px solid rgba(0,0,0,0.06)" }}
          >
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:flex-col md:w-64 md:min-h-screen md:shrink-0 md:p-5 bg-white"
        style={{ borderRight: "1px solid rgba(0,0,0,0.06)" }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

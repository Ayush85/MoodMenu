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
        { href: "/dashboard", label: "Overview", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
        { href: primaryRestaurantId ? `/dashboard/restaurant/${primaryRestaurantId}/staff` : "/dashboard", label: "Staff Panel", icon: "M17 20h5V4H2v16h5m10 0v-8a2 2 0 00-2-2H9a2 2 0 00-2 2v8m10 0H7" },
      ]
    : [
        { href: "/dashboard", label: "Overview", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
        { href: "/dashboard/restaurant/new", label: "Add Restaurant", icon: "M12 4v16m8-8H4" },
      ];

  return (
    <aside className="w-full bg-gray-900 text-white px-3 py-2 sm:px-4 sm:py-3 md:w-64 md:min-h-screen md:p-6 md:flex md:flex-col md:shrink-0">
      <div className="mb-2 md:mb-8 flex items-center justify-between gap-3 md:block">
        <div>
          <Link href="/dashboard" className="text-[2rem] font-bold text-orange-400 block leading-none md:text-2xl mb-1">
            MoodMenu
          </Link>
          <span className="hidden md:inline text-xs text-gray-500 font-mono">{isStaff ? "Restaurant Staff" : "Restaurant Admin"}</span>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          {isSuperAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-300 hover:text-red-200 hover:bg-gray-800 transition"
              aria-label="Super Admin"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition"
            aria-label="Sign Out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {restaurants.length > 1 && (
        <div className="mb-3 md:mb-5">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
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
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-orange-400"
          >
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="grid grid-cols-2 gap-2 md:flex-1 md:block md:space-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center justify-center gap-2 px-2.5 py-2 rounded-xl transition whitespace-nowrap md:justify-start md:gap-3 md:px-4 md:py-3 ${
              pathname === link.href
                ? "bg-orange-500 text-white shadow-sm"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
            </svg>
            <span className="text-sm font-medium md:text-base">{link.label}</span>
          </Link>
        ))}
      </nav>

      <div className="hidden md:block border-t border-gray-700 pt-4 mt-4 space-y-2">
        {isSuperAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-gray-800 rounded-lg transition text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Super Admin
          </Link>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition w-full text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

"use client";

import { readJson } from "@/lib/read-json";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import NavLink from "@/components/ui/NavLink";
import { BookOpen, ClipboardList, MoreHorizontal, Users, X } from "lucide-react";

interface RestaurantOption {
  id: string;
  name: string;
  slug: string;
}

const RESTAURANT_NAV = [
  {
    key: "analytics",
    label: "Analytics",
    suffix: "/analytics",
    icon: (
      <svg className="w-4.25 h-4.25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key: "expenses",
    label: "Expenses",
    suffix: "/expenses",
    icon: (
      <svg className="w-4.25 h-4.25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    key: "orders",
    label: "Orders",
    suffix: "/orders",
    icon: <ClipboardList className="w-4.25 h-4.25" />,
  },
  {
    key: "menu",
    label: "Menu",
    suffix: "/menu",
    icon: (
      <svg className="w-4.25 h-4.25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    key: "tables",
    label: "Tables & WiFi",
    suffix: "/tables",
    icon: (
      <svg className="w-4.25 h-4.25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M3 6h18M3 14h18M3 18h18" />
      </svg>
    ),
  },
  {
    key: "offers",
    label: "Offers",
    suffix: "/offers",
    icon: (
      <svg className="w-4.25 h-4.25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 12l-8 8-8-8 8-8 8 8zM12 8h.01M16 12h.01M12 16h.01" />
      </svg>
    ),
  },
  {
    key: "staff",
    label: "Staff",
    suffix: "/staff",
    icon: (
      <svg className="w-4.25 h-4.25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    key: "mood",
    label: "Mood Rules",
    suffix: "/mood",
    icon: (
      <svg className="w-4.25 h-4.25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    key: "design",
    label: "Design",
    suffix: "/design",
    icon: (
      <svg className="w-4.25 h-4.25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM12 3h6a2 2 0 012 2v3a2 2 0 01-2 2h-6zM12 12h8a2 2 0 012 2v3a2 2 0 01-2 2h-8z" />
      </svg>
    ),
  },
  {
    key: "qr",
    label: "QR Codes",
    suffix: "/qr",
    icon: (
      <svg className="w-4.25 h-4.25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [restaurantError, setRestaurantError] = useState(false);
  const [retryRestaurants, setRetryRestaurants] = useState(0);
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const isStaff = session?.user?.actorType === "STAFF";
  const primaryRestaurantId = session?.user?.restaurantId || session?.user?.restaurantIds?.[0];
  const mobileQuickNav = isStaff
    ? [{ label: "Orders", suffix: "orders", active: pathname.includes("/orders"), icon: ClipboardList }]
    : [
        { label: "Orders", suffix: "orders", active: pathname.includes("/orders"), icon: ClipboardList },
        { label: "Menu", suffix: "menu", active: pathname.includes("/menu"), icon: BookOpen },
        { label: "Staff", suffix: "staff", active: pathname.includes("/staff"), icon: Users },
      ];

  useEffect(() => {
    fetch("/api/restaurants")
      .then(readJson<RestaurantOption[]>)
      .then((data) => {
        const list = Array.isArray(data)
          ? data.map((r) => ({ id: r.id as string, name: r.name as string, slug: r.slug as string }))
          : [];
        setRestaurants(list);
        setRestaurantError(false);
      })
      .catch(() => setRestaurantError(true));
  }, [retryRestaurants]);

  const currentRestaurantId = useMemo(() => {
    const match = pathname.match(/\/dashboard\/restaurant\/([^/]+)/);
    if (match?.[1] && match[1] !== "new") return match[1];
    return primaryRestaurantId || "";
  }, [pathname, primaryRestaurantId]);

  // "/dashboard/restaurant/new" is the create flow, not a restaurant workspace,
  // so it must show the account-level nav rather than restaurant-scoped links.
  const insideRestaurant = useMemo(
    () => /\/dashboard\/restaurant\/(?!new(?:\/|$))[^/]+/.test(pathname),
    [pathname]
  );

  const currentRestaurant = restaurants.find((r) => r.id === currentRestaurantId);

  const close = useCallback(() => setMobileOpen(false), []);

  // Mobile drawer behaves as a modal dialog: Escape closes it, Tab stays
  // inside it, the page behind does not scroll, and focus returns to the
  // control that opened it.
  useEffect(() => {
    if (!mobileOpen) return;
    lastTriggerRef.current = document.activeElement as HTMLElement | null;
    drawerCloseRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab" || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      lastTriggerRef.current?.focus();
    };
  }, [mobileOpen, close]);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2.5 group" onClick={close}>
          <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#263b32] text-base font-extrabold leading-none tracking-tight text-[#fbfaf6]">
            m<span className="text-[#c65b36]">.</span>
          </span>
          <div>
            <span className="text-[15px] font-bold text-gray-900 block leading-none">Menuor</span>
            <span className="text-[11px] text-gray-500 font-medium uppercase tracking-widest mt-1 block">
              {isStaff ? "Staff Portal" : "Dashboard"}
            </span>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {restaurantError && <div role="status" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Restaurant list unavailable.<button className="min-h-11 underline" onClick={() => setRetryRestaurants(value => value + 1)}>Retry</button></div>}
        {/* Restaurant context navigation */}
        {insideRestaurant && !isStaff && (
          <div>
            {/* Restaurant switcher */}
            {restaurants.length > 1 ? (
              <div className="mb-3">
                <label htmlFor="restaurant-switcher" className="block text-xs font-bold uppercase tracking-widest text-gray-600 px-2 mb-1.5">
                  Restaurant
                </label>
                <select id="restaurant-switcher"
                  value={currentRestaurantId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                    const nextId = e.target.value;
                    if (!nextId) return;
                    const workspace = pathname.split("/")[4];
                    const supported = RESTAURANT_NAV.some(item => item.suffix === "/" + workspace);
                    router.push(`/dashboard/restaurant/${nextId}/${supported ? workspace : "orders"}`);
                  }}
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus-visible:border-orange-700 focus-visible:ring-2 focus-visible:ring-orange-700/30 transition"
                >
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            ) : currentRestaurant ? (
              <div className="flex items-center gap-2.5 px-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center text-xs font-bold shrink-0">
                  {currentRestaurant.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{currentRestaurant.name}</p>
                  <p className="text-xs text-gray-500">Current restaurant</p>
                </div>
              </div>
            ) : null}

            {/* Restaurant sub-nav */}
            <nav aria-label="Restaurant" className="space-y-0.5">
              {[
                { label: "Daily operations", keys: ["orders", "tables", "staff"] },
                { label: "Menu & guest experience", keys: ["menu", "offers", "qr", "design", "mood"] },
                { label: "Business", keys: ["analytics", "expenses"] },
              ].map(group => <div key={group.label} className="mb-4">
                <p className="px-2 py-2 text-xs font-semibold text-gray-600">{group.label}</p>
                {group.keys.map(key => {
                  const item = RESTAURANT_NAV.find(item => item.key === key)!;
                  return <NavLink key={item.key} href={`/dashboard/restaurant/${currentRestaurantId}${item.suffix}`} pathname={pathname} label={item.label} icon={item.icon} onClick={close} />;
                })}
              </div>)}

              {/* View Menu external link */}
              {(() => {
                const slug = restaurants.find((r) => r.id === currentRestaurantId)?.slug;
                return slug ? (
                  <NavLink
                    href={`/menu/${slug}`}
                    pathname={pathname}
                    label="View Live Menu"
                    external
                    onClick={close}
                    icon={
                      <svg className="w-4.25 h-4.25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    }
                  />
                ) : null;
              })()}
            </nav>

            {/* Divider */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <NavLink
                href="/dashboard"
                pathname={pathname}
                exact
                onClick={close}
                label="All Restaurants"
                accentClassName="bg-orange-50 text-orange-800"
                icon={
                  <svg className="w-4.25 h-4.25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                }
              />
            </div>
          </div>
        )}

        {/* Staff inside restaurant */}
        {insideRestaurant && isStaff && (
          <nav aria-label="Staff" className="space-y-0.5">
            <NavLink
              href={`/dashboard/restaurant/${currentRestaurantId}/orders`}
              pathname={pathname}
              onClick={close}
              label="Orders"
              icon={<ClipboardList className="w-4.25 h-4.25" />}
            />
          </nav>
        )}

        {/* Default nav — when NOT inside a restaurant */}
        {!insideRestaurant && (
          <nav aria-label="Dashboard" className="space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 px-2 mb-1.5">Navigation</p>
            <NavLink
              href="/dashboard"
              pathname={pathname}
              exact
              onClick={close}
              label="Overview"
              icon={
                <svg className="w-4.25 h-4.25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              }
            />

            {!isStaff && (
              <NavLink
                href="/dashboard/restaurant/new"
                pathname={pathname}
                exact
                onClick={close}
                label="Add Restaurant"
                icon={
                  <svg className="w-4.25 h-4.25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />
                  </svg>
                }
              />
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
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-700 hover:bg-red-50 transition min-h-11 text-sm font-medium"
          >
            <svg className="w-4.25 h-4.25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Super Admin
          </Link>
        )}

        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50">
          <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center text-xs font-bold shrink-0" aria-hidden="true">
            {session?.user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate leading-tight">
              {session?.user?.name || "User"}
            </p>
            <p className="text-xs text-gray-500 truncate">{session?.user?.email || ""}</p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:text-red-700 hover:bg-red-50 transition w-full min-h-11 text-sm font-medium"
        >
          <svg className="w-4.25 h-4.25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <span aria-hidden="true" className="grid size-7 place-items-center rounded-md bg-[#263b32] text-sm font-extrabold leading-none text-[#fbfaf6]">
            m<span className="text-[#c65b36]">.</span>
          </span>
          <span className="text-sm font-bold text-gray-900">Menuor</span>
        </Link>
        <div className="flex items-center gap-1">
          {isSuperAdmin && (
            <Link href="/admin" aria-label="Super admin" className="size-11 rounded-lg flex items-center justify-center text-red-700 hover:bg-red-50 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-dashboard-drawer"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            className="size-11 rounded-lg flex items-center justify-center text-gray-700 hover:bg-gray-100 transition"
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
          <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={close} />
          <aside
            ref={drawerRef}
            id="mobile-dashboard-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Dashboard navigation"
            className="fixed top-0 left-0 bottom-0 z-50 w-[min(18rem,86vw)] bg-white md:hidden animate-slide-in-right shadow-xl"
          >
            <button
              ref={drawerCloseRef}
              onClick={close}
              aria-label="Close navigation"
              className="absolute right-2 top-3 z-10 grid size-11 place-items-center rounded-lg text-gray-700 hover:bg-gray-100"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Mobile quick navigation keeps the daily actions one tap away. */}
      {insideRestaurant && currentRestaurantId && <nav className={`fixed inset-x-0 bottom-0 z-30 grid ${mobileQuickNav.length === 1 ? "grid-cols-2" : "grid-cols-4"} border-t border-gray-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden`} aria-label="Quick navigation">
        {mobileQuickNav.map((item) => (
            <Link key={item.suffix} href={`/dashboard/restaurant/${currentRestaurantId}/${item.suffix}`} onClick={close} className={`flex min-h-12 flex-col items-center justify-center rounded-xl text-[11px] font-bold ${item.active ? "bg-orange-50 text-orange-800" : "text-gray-600"}`} aria-current={item.active ? "page" : undefined}>
              <item.icon className="mb-0.5 h-4 w-4" />
              {item.label}
            </Link>
        ))}
        <button onClick={() => setMobileOpen(true)} aria-haspopup="dialog" aria-controls="mobile-dashboard-drawer" className="flex min-h-12 flex-col items-center justify-center rounded-xl text-[11px] font-bold text-gray-600"><MoreHorizontal className="mb-0.5 h-4 w-4" />More</button>
      </nav>}

      {/* Desktop sidebar */}
      <aside aria-label="Dashboard sidebar" className="hidden md:flex md:flex-col md:w-60 md:h-screen md:sticky md:top-0 md:shrink-0 bg-white border-r border-gray-100">
        {sidebarContent}
      </aside>
    </>
  );
}

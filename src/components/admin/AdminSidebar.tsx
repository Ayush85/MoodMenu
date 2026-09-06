"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export default function AdminSidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/admin", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { href: "/admin/users", label: "Users", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
    { href: "/admin/restaurants", label: "Restaurants", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  ];

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <aside
      className="w-full px-3 py-3 sm:px-4 sm:py-4 md:w-64 md:min-h-screen md:p-5 md:flex md:flex-col md:shrink-0"
      style={{
        background: "linear-gradient(180deg, rgba(15,15,20,0.98), rgba(15,15,20,0.95))",
        borderRight: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div className="mb-3 md:mb-8 flex items-start justify-between gap-3 md:block">
        <div>
          <Link href="/admin" className="flex items-center gap-2 group mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center transition-all group-hover:shadow-lg group-hover:shadow-red-500/20 group-hover:scale-105">
              <span className="text-white text-sm font-black">M</span>
            </div>
            <span className="text-lg font-bold text-white">Menuor</span>
          </Link>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-md inline-block">
            Super Admin
          </span>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-1 md:block md:space-y-1 md:overflow-visible md:pb-0">
        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative shrink-0 flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap ${active
                  ? "bg-white/[0.08] text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-red-500 to-rose-500 hidden md:block" />
              )}
              <svg className={`w-[18px] h-[18px] ${active ? "text-red-400" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={link.icon} />
              </svg>
              <span className="text-sm font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="hidden md:block border-t border-white/[0.06] pt-4 mt-4 space-y-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.04] transition text-sm"
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">Restaurant Panel</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition w-full text-sm"
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

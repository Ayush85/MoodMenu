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

  return (
    <aside className="w-full bg-slate-900 text-white px-3 py-3 sm:px-4 sm:py-4 md:w-64 md:min-h-screen md:p-6 md:flex md:flex-col md:shrink-0">
      <div className="mb-3 md:mb-8 flex items-start justify-between gap-3 md:block">
        <div>
        <Link href="/admin" className="text-xl sm:text-2xl font-bold text-red-400 mb-2 block">
          MoodMenu
        </Link>
        <span className="text-xs text-slate-400 font-mono border border-red-500/30 bg-red-500/10 text-red-400 px-2 py-1 rounded inline-block w-fit">
          SUPER ADMIN
        </span>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-1 md:block md:space-y-2 md:overflow-visible md:pb-0">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg transition whitespace-nowrap md:gap-3 md:px-4 md:py-3 ${
              pathname === link.href
                ? "bg-red-500 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
            </svg>
            <span className="text-sm md:text-base">{link.label}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t border-slate-700 pt-4 mt-4 space-y-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Restaurant Panel
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition w-full text-sm"
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

"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface NavLinkProps {
  href: string;
  /** Current route (usePathname()) — active state is derived from this + href, so callers don't duplicate the match logic */
  pathname: string;
  /** Require an exact pathname match instead of the default prefix match */
  exact?: boolean;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  external?: boolean;
  /** Dashboard = light chrome, Admin = dark chrome */
  theme?: "light" | "dark";
  /** Active-state background + text classes */
  accentClassName?: string;
  /** Active-state icon color class */
  accentIconClassName?: string;
  /** Active-indicator bar gradient classes, e.g. "from-orange-700 to-orange-800" */
  indicatorGradient?: string;
  /** Extra classes on the indicator bar (e.g. "hidden md:block" for admin's horizontal mobile nav) */
  indicatorClassName?: string;
  /** Hide the left active-indicator bar entirely */
  showIndicator?: boolean;
}

const BASE_INACTIVE: Record<"light" | "dark", string> = {
  light: "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70",
  dark: "text-gray-400 hover:text-white hover:bg-white/[0.04]",
};

export default function NavLink({
  href,
  pathname,
  exact = false,
  label,
  icon,
  onClick,
  external = false,
  theme = "light",
  accentClassName = "bg-orange-50 text-orange-800",
  accentIconClassName = "text-orange-700",
  indicatorGradient = "from-orange-700 to-orange-800",
  indicatorClassName = "",
  showIndicator = true,
}: NavLinkProps) {
  const active = exact ? pathname === href : pathname.startsWith(href);
  const iconInactive = theme === "dark" ? "text-gray-500" : "text-gray-500 group-hover:text-gray-700";
  const className = `relative flex min-h-11 items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 text-sm font-medium group ${
    active ? `${accentClassName} font-semibold` : BASE_INACTIVE[theme]
  }`;

  const content = (
    <>
      {active && showIndicator && (
        <div aria-hidden="true" className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5 rounded-r-full bg-linear-to-b ${indicatorGradient} ${indicatorClassName}`} />
      )}
      {icon && <span aria-hidden="true" className={active ? accentIconClassName : iconInactive}>{icon}</span>}
      {label}
      {external && <span className="sr-only"> (opens in a new tab)</span>}
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} onClick={onClick} className={className} aria-current={active ? "page" : undefined}>
      {content}
    </Link>
  );
}

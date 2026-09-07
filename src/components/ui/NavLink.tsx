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
  /** Active-indicator bar gradient classes, e.g. "from-orange-500 to-rose-500" */
  indicatorGradient?: string;
  /** Extra classes on the indicator bar (e.g. "hidden md:block" for admin's horizontal mobile nav) */
  indicatorClassName?: string;
  /** Hide the left active-indicator bar entirely */
  showIndicator?: boolean;
}

const BASE_INACTIVE: Record<"light" | "dark", string> = {
  light: "text-gray-500 hover:text-gray-800 hover:bg-gray-50",
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
  accentClassName = "bg-orange-50 text-orange-700",
  accentIconClassName = "text-orange-500",
  indicatorGradient = "from-orange-500 to-rose-500",
  indicatorClassName = "",
  showIndicator = true,
}: NavLinkProps) {
  const active = exact ? pathname === href : pathname.startsWith(href);
  const iconInactive = theme === "dark" ? "text-gray-500" : "text-gray-400 group-hover:text-gray-500";
  const className = `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium group ${
    active ? `${accentClassName} font-semibold` : BASE_INACTIVE[theme]
  }`;

  const content = (
    <>
      {active && showIndicator && (
        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5 rounded-r-full bg-linear-to-b ${indicatorGradient} ${indicatorClassName}`} />
      )}
      {icon && <span className={active ? accentIconClassName : iconInactive}>{icon}</span>}
      {label}
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
    <Link href={href} onClick={onClick} className={className}>
      {content}
    </Link>
  );
}

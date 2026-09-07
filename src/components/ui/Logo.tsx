"use client";

import { useId } from "react";
import { BRAND_MARK_VIEWBOX, BRAND_MARK_PATH, BRAND_MARK_DOT, BRAND_GRADIENT_STOPS } from "@/lib/brand-mark";

interface LogoProps {
  /** "mark" = icon only, "full" = icon + wordmark */
  variant?: "mark" | "full";
  size?: number;
  className?: string;
  /** Wordmark text color — defaults to the current text color */
  wordmarkClassName?: string;
}

export default function Logo({ variant = "full", size = 36, className = "", wordmarkClassName = "" }: LogoProps) {
  const gradientId = useId();

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox={BRAND_MARK_VIEWBOX} role="img" aria-label="Menuor logo" className="shrink-0">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
            {BRAND_GRADIENT_STOPS.map((stop) => (
              <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>
        <path d={BRAND_MARK_PATH} fill={`url(#${gradientId})`} />
        <circle cx={BRAND_MARK_DOT.cx} cy={BRAND_MARK_DOT.cy} r={BRAND_MARK_DOT.r} fill="#ffffff" opacity={0.9} />
      </svg>
      {variant === "full" && (
        <span className={`font-bold text-lg tracking-tight ${wordmarkClassName}`} style={wordmarkClassName ? undefined : { color: "var(--text-primary)" }}>
          Menuor
        </span>
      )}
    </span>
  );
}

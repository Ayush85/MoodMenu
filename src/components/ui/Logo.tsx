"use client";

import { useId } from "react";

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
      <svg width={size} height={size} viewBox="0 0 256 256" role="img" aria-label="Menuor logo" className="shrink-0">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <g transform="translate(32,32)">
          <path
            d="M16 160 L64 72 L96 120 L128 56 L176 160 Z"
            fill={`url(#${gradientId})`}
            stroke="#0f172a"
            strokeWidth={4}
            strokeLinejoin="round"
          />
          <circle cx="200" cy="40" r="12" fill="#F97316" />
        </g>
      </svg>
      {variant === "full" && (
        <span className={`font-bold text-lg tracking-tight ${wordmarkClassName}`} style={wordmarkClassName ? undefined : { color: "var(--text-primary)" }}>
          Menuor
        </span>
      )}
    </span>
  );
}

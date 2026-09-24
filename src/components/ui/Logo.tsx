"use client";

interface LogoProps {
  /** "mark" = smaller size (for tight spaces like a collapsed sidebar), "full" = normal size */
  variant?: "mark" | "full";
  size?: number;
  className?: string;
  /** Wordmark text color — defaults to the current text color */
  wordmarkClassName?: string;
}

export default function Logo({ variant = "full", size = 36, className = "", wordmarkClassName = "" }: LogoProps) {
  return (
    <span
      aria-label="Menuor"
      className={`inline-flex items-center font-extrabold tracking-tight ${wordmarkClassName} ${className}`}
      style={{ fontSize: size * (variant === "mark" ? 0.4 : 0.5), lineHeight: 1, ...(wordmarkClassName ? {} : { color: "var(--text-primary)" }) }}
    >
      Menuor
    </span>
  );
}

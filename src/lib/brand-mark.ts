// Single source of truth for the Menuor logo mark, shared by Logo.tsx, og-image.tsx,
// apple-icon.tsx, and icon.tsx. Keep public/logo.svg manually in sync — it's a static
// file (used by the FCM service worker and notification icons) that can't import this.

export const BRAND_MARK_VIEWBOX = "0 0 256 256";

// A soft flame/drop shape — evokes warmth, flavor, and mood.
export const BRAND_MARK_PATH =
  "M128 24C154 64 182 108 182 148C182 193 159 222 128 222C97 222 74 193 74 148C74 108 102 64 128 24Z";

export const BRAND_MARK_DOT = { cx: 196, cy: 56, r: 13 };

export const BRAND_GRADIENT_STOPS = [
  { offset: "0%", color: "#f97316" },
  { offset: "50%", color: "#ec4899" },
  { offset: "100%", color: "#8b5cf6" },
] as const;

export const BRAND_GRADIENT_CSS = "linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)";

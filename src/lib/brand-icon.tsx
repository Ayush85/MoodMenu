/**
 * Square brand mark used for the favicon, touch icon, and Organization logo.
 * Search engines crop favicons to a small square or circle, so the mark is a
 * single bold letter on a solid brand-green background (the wordmark itself
 * is unreadable at 16-48px).
 */
export function BrandMark({ px }: { px: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#263b32",
        color: "#fbfaf6",
        fontSize: px * 0.74,
        fontWeight: 800,
        letterSpacing: -px * 0.04,
        lineHeight: 1,
      }}
    >
      m<span style={{ color: "#c65b36" }}>.</span>
    </div>
  );
}

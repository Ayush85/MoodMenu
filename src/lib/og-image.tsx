import { BRAND_MARK_VIEWBOX, BRAND_MARK_PATH, BRAND_MARK_DOT, BRAND_GRADIENT_CSS } from "@/lib/brand-mark";

export const ogImageSize = { width: 1200, height: 630 };
export const ogImageContentType = "image/png";

export function OgImageContent() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_GRADIENT_CSS,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <svg width={96} height={96} viewBox={BRAND_MARK_VIEWBOX}>
          <path d={BRAND_MARK_PATH} fill="#ffffff" />
          <circle cx={BRAND_MARK_DOT.cx} cy={BRAND_MARK_DOT.cy} r={BRAND_MARK_DOT.r} fill="#0f172a" />
        </svg>
        <span style={{ fontSize: 96, fontWeight: 800, color: "#ffffff" }}>Menuor</span>
      </div>
      <span style={{ marginTop: 24, fontSize: 32, color: "rgba(255,255,255,0.9)" }}>
        Smart digital menus for restaurants
      </span>
    </div>
  );
}

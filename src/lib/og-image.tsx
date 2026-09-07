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
        background: "linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <svg width={96} height={96} viewBox="0 0 256 256">
          <g transform="translate(32,32)">
            <path d="M16 160 L64 72 L96 120 L128 56 L176 160 Z" fill="#ffffff" stroke="#0f172a" strokeWidth={4} strokeLinejoin="round" />
            <circle cx="200" cy="40" r="12" fill="#0f172a" />
          </g>
        </svg>
        <span style={{ fontSize: 96, fontWeight: 800, color: "#ffffff" }}>Menuor</span>
      </div>
      <span style={{ marginTop: 24, fontSize: 32, color: "rgba(255,255,255,0.9)" }}>
        Smart digital menus for restaurants
      </span>
    </div>
  );
}

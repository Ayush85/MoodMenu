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
        background: "#ffffff",
      }}
    >
      <span style={{ fontSize: 120, fontWeight: 800, color: "#111111", letterSpacing: -2 }}>Menuor</span>
      <span style={{ marginTop: 16, fontSize: 32, color: "#4b5563" }}>
        Smart digital menus for restaurants
      </span>
    </div>
  );
}

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
        background: "#fbfaf6",
      }}
    >
      <span style={{ fontSize: 30, color: "#a34e30", marginBottom: 28 }}>FOR RESTAURANTS & CAFÉS IN NEPAL</span>
      <span style={{ fontSize: 120, fontWeight: 800, color: "#263b32", letterSpacing: -2 }}>Menuor</span>
      <span style={{ marginTop: 16, fontSize: 36, color: "#263b32" }}>
        Your QR menu. Your orders. One happy service.
      </span>
    </div>
  );
}

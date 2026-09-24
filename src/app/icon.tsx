import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default async function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 800, color: "#111111", letterSpacing: -0.5 }}>Menuor</span>
      </div>
    ),
    { ...size }
  );
}

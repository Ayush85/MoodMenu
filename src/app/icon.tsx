import { ImageResponse } from "next/og";
import { BRAND_MARK_VIEWBOX, BRAND_MARK_PATH, BRAND_MARK_DOT, BRAND_GRADIENT_CSS } from "@/lib/brand-mark";

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
          background: BRAND_GRADIENT_CSS,
          borderRadius: 14,
        }}
      >
        <svg width={44} height={44} viewBox={BRAND_MARK_VIEWBOX}>
          <path d={BRAND_MARK_PATH} fill="#ffffff" />
          <circle cx={BRAND_MARK_DOT.cx} cy={BRAND_MARK_DOT.cy} r={BRAND_MARK_DOT.r} fill="#0f172a" />
        </svg>
      </div>
    ),
    { ...size }
  );
}

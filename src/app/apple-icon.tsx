import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)",
        }}
      >
        <svg width={120} height={120} viewBox="0 0 256 256">
          <g transform="translate(32,32)">
            <path d="M16 160 L64 72 L96 120 L128 56 L176 160 Z" fill="#ffffff" stroke="#0f172a" strokeWidth={4} strokeLinejoin="round" />
            <circle cx="200" cy="40" r="12" fill="#0f172a" />
          </g>
        </svg>
      </div>
    ),
    { ...size }
  );
}

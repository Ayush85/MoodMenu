import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand-icon";

// 192px: a multiple of 48, the size Google Search requires for favicons.
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default async function Icon() {
  return new ImageResponse(<BrandMark px={size.width} />, { ...size });
}

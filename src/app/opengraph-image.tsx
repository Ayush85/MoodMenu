import { ImageResponse } from "next/og";
import { OgImageContent, ogImageSize, ogImageContentType } from "@/lib/og-image";

export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image() {
  return new ImageResponse(<OgImageContent />, size);
}

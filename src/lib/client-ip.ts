import { NextRequest } from "next/server";

/** Read the address provided by the trusted reverse proxy. */
export function getClientIp(req: NextRequest): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const addresses = forwarded.split(",").map((value) => value.trim()).filter(Boolean);
    return addresses.at(-1) || "unknown";
  }

  return "unknown";
}

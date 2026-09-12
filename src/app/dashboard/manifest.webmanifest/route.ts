import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    name: "Menuor Restaurant Dashboard",
    short_name: "Menuor Admin",
    description: "Manage your restaurant menu, offers, orders, and staff with Menuor.",
    start_url: "/dashboard",
    scope: "/dashboard",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#f97316",
    orientation: "portrait-primary",
    icons: [{ src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  }, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}

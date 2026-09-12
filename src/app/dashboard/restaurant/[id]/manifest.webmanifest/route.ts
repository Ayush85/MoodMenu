import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function iconType(src: string): string {
  if (src.endsWith(".svg")) return "image/svg+xml";
  if (src.endsWith(".png")) return "image/png";
  if (src.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

// Restaurant-branded PWA manifest, served only when the dashboard is
// accessed through that restaurant's own custom domain (see the
// x-menuor-tenant-id header set in src/middleware.ts and read in
// src/app/dashboard/restaurant/[id]/layout.tsx). Gives staff/admin an
// installed app icon that's the restaurant's own logo, not Menuor's.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { name: true, logo: true },
  });

  const name = restaurant?.name ?? "Menuor";
  const icon = restaurant?.logo || "/logo.svg";

  return NextResponse.json(
    {
      name: `${name} — Dashboard`,
      short_name: name.slice(0, 12),
      description: `Manage ${name}'s menu, orders, tables, and staff.`,
      start_url: `/dashboard/restaurant/${id}/menu`,
      scope: `/dashboard/restaurant/${id}`,
      display: "standalone",
      background_color: "#f8fafc",
      theme_color: "#f97316",
      orientation: "portrait-primary",
      icons: [{ src: icon, sizes: "any", type: iconType(icon), purpose: "any" }],
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}

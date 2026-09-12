import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

function iconType(src: string): string {
  if (src.endsWith(".svg")) return "image/svg+xml";
  if (src.endsWith(".png")) return "image/png";
  if (src.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

// Restaurant-branded PWA manifest for the dashboard, scoped to one
// restaurant (see src/app/dashboard/restaurant/[id]/layout.tsx). Gives
// staff/admin an installed app icon that's the restaurant's own logo, not
// Menuor's, on any domain — and the install itself differs by who's
// installing: an owner/admin gets the full dashboard, while staff (who
// only ever use the Staff Panel — see canUseCalls/canTakeOrders in
// staff/page.tsx) land straight on it instead of the menu editor they
// can't use.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { name: true, logo: true },
  });

  const name = restaurant?.name ?? "Menuor";
  const icon = restaurant?.logo || "/logo.svg";
  const isStaff = session?.user?.actorType === "STAFF";

  const roleLabel = isStaff ? "Staff" : "Admin";
  const startUrl = isStaff
    ? `/dashboard/restaurant/${id}/staff`
    : `/dashboard/restaurant/${id}/menu`;

  return NextResponse.json(
    {
      name: `${name} — ${roleLabel}`,
      short_name: name.slice(0, 12),
      description: isStaff
        ? `Handle ${name}'s waiter calls and orders.`
        : `Manage ${name}'s menu, orders, tables, and staff.`,
      start_url: startUrl,
      scope: `/dashboard/restaurant/${id}`,
      display: "standalone",
      background_color: "#f8fafc",
      theme_color: "#f97316",
      orientation: "portrait-primary",
      icons: [{ src: icon, sizes: "any", type: iconType(icon), purpose: "any" }],
    },
    // Session-dependent response — never cache across different users/roles.
    { headers: { "Cache-Control": "private, no-cache" } }
  );
}

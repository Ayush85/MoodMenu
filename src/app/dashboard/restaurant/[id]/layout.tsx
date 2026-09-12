import type { Metadata } from "next";
import { headers } from "next/headers";

interface Props {
  params: Promise<{ id: string }>;
}

// Only overrides the manifest when this render came through the
// middleware's /admin or /staff rewrite for this restaurant's own verified
// custom domain (see src/middleware.ts) — an owner browsing
// /dashboard/restaurant/[id] on the main app domain keeps the generic
// Menuor dashboard manifest set by the parent dashboard layout.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const hdrs = await headers();
  const isTenantPwa = hdrs.get("x-menuor-tenant-id") === id;

  if (!isTenantPwa) return {};

  return {
    manifest: `/dashboard/restaurant/${id}/manifest.webmanifest`,
  };
}

export default function RestaurantDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

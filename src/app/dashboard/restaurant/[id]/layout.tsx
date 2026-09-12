import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

// Whenever the dashboard is scoped to one specific restaurant, the PWA
// manifest (and therefore the installed app icon) reflects that
// restaurant's own branding — regardless of which domain it was reached
// through. Only the top-level /dashboard (no restaurant in the URL, e.g.
// the restaurant-list page) keeps the generic Menuor manifest set by the
// parent dashboard layout.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  return {
    manifest: `/dashboard/restaurant/${id}/manifest.webmanifest`,
  };
}

export default function RestaurantDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { isPlatformHost } from "@/lib/site-host";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_BASE_URL || "https://menuor.com";
  const hostHeader = (await headers()).get("host") || "";
  const hostname = hostHeader.split(":")[0].toLowerCase();

  // A restaurant's own custom domain gets its own small sitemap covering
  // just its pages — listing menuor.com's other tenants there would be
  // wrong, and listing this domain's pages under menuor.com's sitemap
  // would conflict with the canonical URLs those pages declare.
  if (hostname && !isPlatformHost(hostname)) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { customDomain: hostname },
      select: { landingEnabled: true, updatedAt: true },
    });
    if (!restaurant) return [];

    const origin = `https://${hostname}`;
    if (restaurant.landingEnabled) {
      return [
        { url: `${origin}/`, lastModified: restaurant.updatedAt, changeFrequency: "weekly", priority: 1.0 },
        { url: `${origin}/menu`, lastModified: restaurant.updatedAt, changeFrequency: "daily", priority: 0.9 },
      ];
    }
    return [{ url: `${origin}/`, lastModified: restaurant.updatedAt, changeFrequency: "daily", priority: 1.0 }];
  }

  // Restaurants on their own custom domain are excluded here — their
  // canonical URLs live on that domain now, not under /menu or /landing.
  const restaurants = await prisma.restaurant.findMany({
    where: { customDomain: null },
    select: { slug: true, updatedAt: true, landingEnabled: true },
  });

  const restaurantPages: MetadataRoute.Sitemap = restaurants.flatMap((r) => {
    const entries: MetadataRoute.Sitemap = [
      { url: `${base}/menu/${r.slug}`, lastModified: r.updatedAt, changeFrequency: "daily", priority: 0.9 },
    ];
    if (r.landingEnabled) {
      entries.push({ url: `${base}/landing/${r.slug}`, lastModified: r.updatedAt, changeFrequency: "weekly", priority: 0.8 });
    }
    return entries;
  });

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...restaurantPages,
  ];
}

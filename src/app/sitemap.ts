import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_BASE_URL || "https://menuor.com";

  const restaurants = await prisma.restaurant.findMany({
    select: { slug: true, updatedAt: true },
  });

  const menuPages: MetadataRoute.Sitemap = restaurants.map((r) => ({
    url: `${base}/menu/${r.slug}`,
    lastModified: r.updatedAt,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...menuPages,
  ];
}

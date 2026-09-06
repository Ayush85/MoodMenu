import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_BASE_URL || "https://menuor.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/menu/"],
        disallow: [
          "/dashboard/",
          "/admin/",
          "/api/",
          "/login",
          "/register",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}

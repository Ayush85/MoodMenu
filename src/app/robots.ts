import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { isPlatformHost } from "@/lib/site-host";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = process.env.APP_BASE_URL || "https://menuor.com";
  const hostHeader = (await headers()).get("host") || "";
  const hostname = hostHeader.split(":")[0].toLowerCase();

  // On a restaurant's own custom domain, point crawlers at that domain's
  // own sitemap rather than menuor.com's — Google ignores cross-host
  // sitemap references, so this must match the host being crawled.
  const sitemapOrigin = hostname && !isPlatformHost(hostname) ? `https://${hostname}` : base;

  const disallow = [
    "/dashboard/",
    "/admin/",
    "/api/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/uploads/",
  ];

  // Search and AI answer-engine crawlers are named explicitly so the policy
  // is unambiguous: public pages may be indexed, cited, and used for
  // retrieval. Private app areas stay blocked for all of them.
  const aiCrawlers = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-SearchBot",
    "Claude-User",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
    "Applebot-Extended",
  ];

  return {
    rules: [
      { userAgent: "*", allow: ["/", "/menu/", "/landing/", "/llms.txt"], disallow },
      { userAgent: aiCrawlers, allow: ["/", "/menu/", "/landing/", "/llms.txt"], disallow },
    ],
    sitemap: `${sitemapOrigin}/sitemap.xml`,
  };
}

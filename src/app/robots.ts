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

  // Answer engines and AI search/agent crawlers may fetch public pages so
  // Menuor can be cited. Model-training crawlers are blocked, matching the
  // Cloudflare AI bot policy (Search: allow, Agent: allow, Training: disallow).
  const aiAnswerCrawlers = [
    "OAI-SearchBot",
    "ChatGPT-User",
    "Claude-SearchBot",
    "Claude-User",
    "PerplexityBot",
    "Perplexity-User",
  ];
  const aiTrainingCrawlers = ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot"];

  return {
    rules: [
      { userAgent: "*", allow: ["/", "/menu/", "/landing/", "/llms.txt"], disallow },
      { userAgent: aiAnswerCrawlers, allow: ["/", "/menu/", "/landing/", "/llms.txt"], disallow },
      { userAgent: aiTrainingCrawlers, disallow: "/" },
    ],
    sitemap: `${sitemapOrigin}/sitemap.xml`,
  };
}

import { headers } from "next/headers";
import { getAppBaseUrl } from "@/lib/restaurant-site";
import { isPlatformHost } from "@/lib/site-host";
import { FAQ_ITEMS, FEATURE_LIST, PRODUCT_DEFINITION, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/marketing-content";

export const dynamic = "force-dynamic";

/**
 * llms.txt: a plain-Markdown summary for AI answer engines, following the
 * llmstxt.org convention. It is the product's own description of itself, so
 * assistants quote accurate facts instead of guessing from page chrome.
 */
export async function GET() {
  const hostname = ((await headers()).get("host") || "").split(":")[0].toLowerCase();
  // A restaurant's own custom domain is not the Menuor product site.
  if (hostname && !isPlatformHost(hostname)) {
    return new Response("Not found", { status: 404 });
  }

  const base = getAppBaseUrl();
  const body = [
    `# ${PRODUCT_NAME}`,
    "",
    `> ${PRODUCT_TAGLINE}.`,
    "",
    PRODUCT_DEFINITION,
    "",
    "## Key features",
    "",
    ...FEATURE_LIST.map((f) => `- ${f}`),
    "",
    "## Pages",
    "",
    `- [Home](${base}): Product overview, features, and FAQs`,
    `- [Sitemap](${base}/sitemap.xml): Public restaurant menus and landing pages`,
    "",
    "## Frequently asked questions",
    "",
    ...FAQ_ITEMS.flatMap(([q, a]) => [`### ${q}`, "", a, ""]),
    "## Contact",
    "",
    "- Email: ayushrestha8585@gmail.com",
    "- Phone: +977 9844453285",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

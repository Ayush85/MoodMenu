import { getAppBaseUrl } from "@/lib/restaurant-site";
import { PRODUCT_NAME } from "@/lib/marketing-content";

/** WebPage + BreadcrumbList nodes shared by the secondary marketing pages. */
export function pageGraph(opts: { path: string; title: string; description: string; crumb: string; extra?: object[] }) {
  const base = getAppBaseUrl();
  const url = base + opts.path;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url + "#webpage",
        url,
        name: opts.title,
        description: opts.description,
        inLanguage: "en",
        isPartOf: { "@id": base + "/#website" },
        breadcrumb: { "@id": url + "#breadcrumb" },
      },
      {
        "@type": "BreadcrumbList",
        "@id": url + "#breadcrumb",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: PRODUCT_NAME, item: base },
          { "@type": "ListItem", position: 2, name: opts.crumb, item: url },
        ],
      },
      ...(opts.extra ?? []),
    ],
  };
}

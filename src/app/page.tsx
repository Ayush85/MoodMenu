import type { Metadata } from "next";
import ProductLanding from "@/components/landing/ProductLanding";
import { serializeJsonLd } from "@/lib/structured-data";
import { getAppBaseUrl } from "@/lib/restaurant-site";
import { FAQ_ITEMS, FEATURE_LIST, PRODUCT_DEFINITION, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/marketing-content";
import "./marketing.css";

const APP_URL = getAppBaseUrl();
const TITLE = "QR Digital Menu & Restaurant Software in Nepal | Menuor";
const DESCRIPTION = "Create a QR digital menu, accept table orders, and manage your restaurant team with Menuor. Built for restaurants and cafés in Nepal. No guest app needed.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: APP_URL },
  keywords: [
    "QR code menu Nepal",
    "digital menu Nepal",
    "restaurant management software Nepal",
    "restaurant ordering system",
    "table ordering QR code",
    "cafe menu software",
  ],
  openGraph: { type: "website", siteName: "Menuor", locale: "en_NP", title: TITLE, description: DESCRIPTION, url: APP_URL },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const ORG_ID = APP_URL + "/#organization";

// One linked @graph: entities reference each other by @id so crawlers and
// AI engines resolve a single coherent "Menuor" entity instead of several
// disconnected fragments.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": ORG_ID,
      name: PRODUCT_NAME,
      url: APP_URL,
      logo: { "@type": "ImageObject", url: APP_URL + "/logo.svg" },
      description: PRODUCT_TAGLINE,
      areaServed: { "@type": "Country", name: "Nepal" },
      founder: { "@type": "Person", name: "Ayush Shrestha" },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        telephone: "+977-9844453285",
        email: "ayushrestha8585@gmail.com",
        availableLanguage: ["English", "Nepali"],
      },
    },
    {
      "@type": "WebSite",
      "@id": APP_URL + "/#website",
      name: PRODUCT_NAME,
      url: APP_URL,
      inLanguage: "en",
      publisher: { "@id": ORG_ID },
    },
    {
      "@type": "WebPage",
      "@id": APP_URL + "/#webpage",
      url: APP_URL,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": APP_URL + "/#website" },
      about: { "@id": APP_URL + "/#software" },
      primaryImageOfPage: { "@type": "ImageObject", url: APP_URL + "/opengraph-image" },
    },
    {
      "@type": "SoftwareApplication",
      "@id": APP_URL + "/#software",
      name: PRODUCT_NAME,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Restaurant management software",
      operatingSystem: "Web",
      url: APP_URL,
      description: PRODUCT_DEFINITION,
      featureList: FEATURE_LIST,
      areaServed: { "@type": "Country", name: "Nepal" },
      audience: { "@type": "BusinessAudience", audienceType: "Restaurants and cafés" },
      publisher: { "@id": ORG_ID },
    },
    {
      "@type": "FAQPage",
      "@id": APP_URL + "/#faq",
      isPartOf: { "@id": APP_URL + "/#webpage" },
      mainEntity: FAQ_ITEMS.map(([name, text]) => ({
        "@type": "Question",
        name,
        acceptedAnswer: { "@type": "Answer", text },
      })),
    },
  ],
};

export default function LandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <ProductLanding />
    </>
  );
}

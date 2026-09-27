import type { Metadata } from "next";
import ProductLanding from "@/components/landing/ProductLanding";
import { serializeJsonLd } from "@/lib/structured-data";
import { getAppBaseUrl } from "@/lib/restaurant-site";
import "./marketing.css";

const APP_URL = getAppBaseUrl();
const TITLE = "QR Digital Menu & Restaurant Software in Nepal | Menuor";
const DESCRIPTION = "Create a QR digital menu, accept table orders, and manage your restaurant team with Menuor. Built for restaurants and cafés in Nepal. No guest app needed.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: APP_URL },
  openGraph: { type: "website", siteName: "Menuor", title: TITLE, description: DESCRIPTION, url: APP_URL },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": APP_URL + "/#organization",
  name: "Menuor",
  url: APP_URL,
  logo: APP_URL + "/logo.svg",
  founder: { "@type": "Person", name: "Ayush Shrestha" },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    telephone: "+977-9844453285",
    email: "ayushrestha8585@gmail.com",
  },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": APP_URL + "/#software",
  name: "Menuor",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: APP_URL,
  publisher: { "@id": APP_URL + "/#organization" },
  description:
    "A restaurant management system combining a QR-code digital menu with table ordering, waiter calls, staff management, expense tracking, and analytics.",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": APP_URL + "/#website",
  name: "Menuor",
  url: APP_URL,
  inLanguage: "en",
  publisher: { "@id": APP_URL + "/#organization" },
};

export default function LandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(softwareJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }} />
      <ProductLanding />
    </>
  );
}

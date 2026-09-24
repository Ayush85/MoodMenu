import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Stats from "@/components/landing/Stats";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import { serializeJsonLd } from "@/lib/structured-data";

const APP_URL = process.env.APP_BASE_URL || "https://menuor.com";

export const metadata: Metadata = {
  title: "Restaurant Management System & Digital Menu Software",
  description:
    "Menuor is a restaurant management system with a QR-code digital menu, table ordering, waiter calls, staff accounts, expense tracking, and analytics. Free to start.",
  alternates: { canonical: APP_URL },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Menuor",
  url: APP_URL,
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
  name: "Menuor",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: APP_URL,
  description:
    "A restaurant management system combining a QR-code digital menu with table ordering, waiter calls, staff management, expense tracking, and analytics.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(softwareJsonLd) }} />
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}

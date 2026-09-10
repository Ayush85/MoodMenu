import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Stats from "@/components/landing/Stats";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Menuor",
  url: process.env.APP_BASE_URL || "https://menuor.com",
  founder: { "@type": "Person", name: "Ayush Shrestha" },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    telephone: "+977-9844453285",
    email: "ayushrestha8585@gmail.com",
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <CTA />
      <Footer />
    </div>
  );
}

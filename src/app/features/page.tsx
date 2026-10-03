import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import { features } from "@/components/landing/features";
import { serializeJsonLd } from "@/lib/structured-data";
import { getAppBaseUrl } from "@/lib/restaurant-site";
import { pageGraph } from "@/lib/page-jsonld";
import { FEATURE_LIST } from "@/lib/marketing-content";

const TITLE = "Restaurant Management & QR Menu Features | Menuor";
const DESCRIPTION = "Explore Menuor features: QR code digital menu, table ordering, live order board, waiter calls, staff roles, expense tracking, analytics, and your own restaurant landing page.";
const PATH = "/features";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: getAppBaseUrl() + PATH },
  openGraph: { type: "website", siteName: "Menuor", locale: "en_NP", title: TITLE, description: DESCRIPTION, url: getAppBaseUrl() + PATH },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function FeaturesPage() {
  const jsonLd = pageGraph({
    path: PATH, title: TITLE, description: DESCRIPTION, crumb: "Features",
    extra: [{ "@type": "ItemList", name: "Menuor features", itemListElement: FEATURE_LIST.map((name, i) => ({ "@type": "ListItem", position: i + 1, name })) }],
  });
  return (
    <MarketingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <section className="marketing-container marketing-section">
        <div className="marketing-section-heading"><div><p className="marketing-eyebrow">Features</p><h1>Everything for the<br /><span>whole service.</span></h1></div><p>Menuor starts with a QR code digital menu and adds ordering, staff, and the everyday details of running a restaurant or café in Nepal.</p></div>
        <div className="marketing-feature-grid">{features.map(({ icon: Icon, title, text }, i) => <article key={title}><div className="marketing-feature-top"><Icon size={25} aria-hidden="true" /><span>0{i + 1}</span></div><h2 style={{ fontSize: 20 }}>{title}</h2><p>{text}</p></article>)}</div>
      </section>
      <section className="marketing-container marketing-cta"><p className="marketing-eyebrow">Free during launch</p><h2>Try it in<br /><span>your restaurant.</span></h2><p>Create your menu and print your first table QR code today.</p><Link href="/register" className="marketing-button">Create your menu <ArrowRight size={18} /></Link></section>
    </MarketingShell>
  );
}

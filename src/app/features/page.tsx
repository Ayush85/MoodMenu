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
      <div className="marketing-container marketing-page-header">
        <h1>Features for restaurants and cafés</h1>
        <p className="marketing-lead">Menuor starts with a QR code digital menu and adds ordering, staff accounts, and analytics for running a restaurant in Nepal.</p>
      </div>
      <section className="marketing-container marketing-section" style={{ paddingTop: 24 }} aria-label="Feature list">
        <div className="marketing-feature-grid">{features.map(({ icon: Icon, title, text }) => <article key={title}><div className="marketing-feature-icon"><Icon size={20} aria-hidden="true" /></div><h2 style={{ fontSize: 17 }}>{title}</h2><p>{text}</p></article>)}</div>
      </section>
      <section className="marketing-container" style={{ paddingTop: 16 }}>
        <div className="marketing-cta"><h2>Try it in your restaurant</h2><p>Create your menu and print your first table QR code today. Free during launch.</p><Link href="/register" className="marketing-button">Create your menu <ArrowRight size={16} aria-hidden="true" /></Link></div>
      </section>
    </MarketingShell>
  );
}

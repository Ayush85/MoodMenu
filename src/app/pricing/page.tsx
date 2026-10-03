import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import { serializeJsonLd } from "@/lib/structured-data";
import { getAppBaseUrl } from "@/lib/restaurant-site";
import { pageGraph } from "@/lib/page-jsonld";
import { PRICING_ANSWER } from "@/lib/marketing-content";

const TITLE = "Menuor Pricing: Free QR Menu Software for Nepal";
const DESCRIPTION = "Menuor is free during launch. See what is included today and how pricing is planned: free menu management with limited updates, and paid restaurant tools.";
const PATH = "/pricing";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: getAppBaseUrl() + PATH },
  openGraph: { type: "website", siteName: "Menuor", locale: "en_NP", title: TITLE, description: DESCRIPTION, url: getAppBaseUrl() + PATH },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const included = [
  "QR code digital menu with categories, photos, and prices",
  "Table QR codes and guest ordering",
  "Live order board and waiter calls",
  "Staff accounts for waiters, cooks, and chefs",
  "Sales analytics and expense tracking",
  "Restaurant landing page and custom domain",
];

const planned = [
  "Menu management stays free",
  "Free plan has a limited number of menu updates",
  "Free plan is supported by ads",
  "Ordering, staff, and analytics tools are planned as paid features",
];

const faq: ReadonlyArray<readonly [string, string]> = [
  ["Is Menuor free?", PRICING_ANSWER],
  ["Will Menuor stay free?", "The plan is to keep menu management free, with a limited number of menu updates and ads on the free plan. Other restaurant tools are planned as paid features. None of this is live yet, and any change will be announced in advance."],
  ["Do I need a credit card to start?", "No payment details are asked for when you create your restaurant during launch."],
];

export default function PricingPage() {
  const jsonLd = pageGraph({
    path: PATH, title: TITLE, description: DESCRIPTION, crumb: "Pricing",
    extra: [{
      "@type": "FAQPage",
      "@id": getAppBaseUrl() + PATH + "#faq",
      mainEntity: faq.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
    }],
  });
  return (
    <MarketingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <section className="marketing-container marketing-section">
        <div className="marketing-section-heading"><div><p className="marketing-eyebrow">Pricing</p><h1>Free while we launch.<br /><span>Simple plans next.</span></h1></div><p>{PRICING_ANSWER}</p></div>
        <div className="marketing-feature-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <article>
            <p className="marketing-eyebrow">Available now</p>
            <h2 style={{ fontSize: 24 }}>Launch plan · Rs. 0</h2>
            <p>Everything in Menuor is free to use during launch.</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "18px 0 24px", display: "grid", gap: 10 }}>{included.map((i) => <li key={i} style={{ display: "flex", gap: 8, fontSize: 14 }}><Check size={16} aria-hidden="true" />{i}</li>)}</ul>
            <Link href="/register" className="marketing-button">Create your menu <ArrowRight size={18} /></Link>
          </article>
          <article>
            <p className="marketing-eyebrow">Planned, not live yet</p>
            <h2 style={{ fontSize: 24 }}>Free menu plan</h2>
            <p>How we intend to price Menuor after launch. Details and limits will be announced in advance.</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "18px 0 0", display: "grid", gap: 10 }}>{planned.map((i) => <li key={i} style={{ display: "flex", gap: 8, fontSize: 14 }}><Check size={16} aria-hidden="true" />{i}</li>)}</ul>
          </article>
        </div>
      </section>
      <section className="marketing-container marketing-section marketing-faq" aria-labelledby="pricing-faq">
        <div><p className="marketing-eyebrow">Pricing questions</p><h2 id="pricing-faq">Good to <span>know.</span></h2></div>
        <div>{faq.map(([q, a]) => <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div>
      </section>
    </MarketingShell>
  );
}

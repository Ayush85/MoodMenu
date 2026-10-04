import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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

const freePlanned = [
  "Digital menu and QR code",
  "A limited number of menu updates",
  "Supported by ads",
];

const paidPlanned = [
  "Table ordering and the live order board",
  "Staff accounts and roles",
  "Sales analytics and expense tracking",
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
      <div className="marketing-container marketing-page-header">
        <h1>Simple pricing, free during launch</h1>
        <p className="marketing-lead">{PRICING_ANSWER}</p>
      </div>
      <div className="marketing-container marketing-plans">
        <section className="marketing-plan marketing-plan-current" aria-labelledby="plan-launch">
          <header><h2 id="plan-launch">Launch plan</h2><span className="marketing-badge">Available now</span></header>
          <p className="marketing-plan-price">Rs. 0<small>Free during launch</small></p>
          <p>Everything in Menuor, with no limits on menu updates.</p>
          <ul>{included.map((i) => <li key={i}>{i}</li>)}</ul>
          <Link href="/register" className="marketing-button">Create your menu <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
        <section className="marketing-plan marketing-plan-planned" aria-labelledby="plan-free">
          <header><h2 id="plan-free">Free plan</h2><span className="marketing-badge marketing-badge-muted">Planned</span></header>
          <p className="marketing-plan-price">Rs. 0<small>Not live yet</small></p>
          <p>Menu management that stays free, with limits.</p>
          <ul>{freePlanned.map((i) => <li key={i}>{i}</li>)}</ul>
        </section>
        <section className="marketing-plan marketing-plan-planned" aria-labelledby="plan-paid">
          <header><h2 id="plan-paid">Restaurant plan</h2><span className="marketing-badge marketing-badge-muted">Planned</span></header>
          <p className="marketing-plan-price">To be announced<small>Not live yet</small></p>
          <p>Tools for running service.</p>
          <ul>{paidPlanned.map((i) => <li key={i}>{i}</li>)}</ul>
        </section>
      </div>
      <div className="marketing-container marketing-fineprint"><p>Planned plans are not available yet and may change. Any change will be announced in advance before it takes effect.</p></div>
      <section className="marketing-section marketing-section-alt" aria-labelledby="pricing-faq"><div className="marketing-container marketing-faq">
        <div className="marketing-faq-aside"><h2 id="pricing-faq">Pricing questions</h2></div>
        <div>{faq.map(([q, a]) => <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div>
      </div></section>
    </MarketingShell>
  );
}

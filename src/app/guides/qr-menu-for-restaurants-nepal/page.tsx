import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import { serializeJsonLd } from "@/lib/structured-data";
import { getAppBaseUrl } from "@/lib/restaurant-site";
import { pageGraph } from "@/lib/page-jsonld";

const TITLE = "How to Make a QR Code Menu for a Restaurant or Café in Nepal";
const DESCRIPTION = "A practical guide to setting up a QR code digital menu for your restaurant or café in Nepal: build the menu, create table QR codes, and start taking orders.";
const PATH = "/guides/qr-menu-for-restaurants-nepal";
const PUBLISHED = "2026-10-03";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: getAppBaseUrl() + PATH },
  openGraph: { type: "article", siteName: "Menuor", locale: "en_NP", title: TITLE, description: DESCRIPTION, url: getAppBaseUrl() + PATH, publishedTime: PUBLISHED },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const steps: ReadonlyArray<readonly [string, string]> = [
  ["Create your restaurant account", "Sign up with Menuor and add your restaurant name and city. Setup takes a few minutes and works on a phone or computer."],
  ["Build your menu", "Add categories such as Momo, Drinks, and Mains, then add each dish with a photo, a short description, and a price in Nepalese rupees. Mark dishes unavailable when they run out instead of deleting them."],
  ["Choose how it looks", "Pick colors, fonts, and a layout that suits your café or restaurant so the menu feels like your brand, not a generic template."],
  ["Create table QR codes", "Generate a QR code for each table. Each code opens the menu in the guest’s phone browser, so there is no app to download. Print them and place them on the tables."],
  ["Start taking orders", "Guests scan, browse, and submit orders from their table. Your team follows each order on the order board from new to preparing, served, and paid, and responds to waiter calls."],
  ["Keep it fresh", "Update prices, photos, and availability any time. Because the QR code points to your online menu, you never reprint it after a change."],
];

const faq: ReadonlyArray<readonly [string, string]> = [
  ["Do guests need an app to scan a QR menu?", "No. Any modern phone camera opens the menu link in the browser."],
  ["Do I need to reprint the QR code when prices change?", "No. The QR code links to your online menu, so price and dish updates appear without reprinting."],
  ["Is it free to set up?", "Menuor is free to use during launch."],
];

export default function GuidePage() {
  const base = getAppBaseUrl();
  const jsonLd = pageGraph({
    path: PATH, title: TITLE, description: DESCRIPTION, crumb: "QR menu guide",
    extra: [
      {
        "@type": "Article",
        "@id": base + PATH + "#article",
        headline: TITLE,
        description: DESCRIPTION,
        datePublished: PUBLISHED,
        dateModified: PUBLISHED,
        inLanguage: "en",
        author: { "@type": "Person", name: "Ayush Shrestha" },
        publisher: { "@id": base + "/#organization" },
        mainEntityOfPage: { "@id": base + PATH + "#webpage" },
      },
      {
        "@type": "HowTo",
        name: TITLE,
        step: steps.map(([name, text], i) => ({ "@type": "HowToStep", position: i + 1, name, text })),
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
      },
    ],
  });
  return (
    <MarketingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <article className="marketing-container marketing-section" style={{ maxWidth: 760 }}>
        <p className="marketing-eyebrow">Guide</p>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.1, margin: "12px 0 20px" }}>How to make a QR code menu for your restaurant or café in Nepal</h1>
        <p className="marketing-lead">A QR code menu lets guests open your menu on their own phone by scanning a code on the table. Here is how to set one up with Menuor, from first dish to first order.</p>
        <p style={{ fontSize: 13, color: "#58655d" }}>By Ayush Shrestha · <time dateTime={PUBLISHED}>3 October 2026</time></p>
        <ol style={{ listStyle: "none", padding: 0, margin: "36px 0", display: "grid", gap: 28 }}>
          {steps.map(([title, text], i) => <li key={title}><h2 style={{ fontSize: 22, marginBottom: 8 }}>{i + 1}. {title}</h2><p style={{ lineHeight: 1.8, color: "#58655d" }}>{text}</p></li>)}
        </ol>
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>Common questions</h2>
        {faq.map(([q, a]) => <div key={q} style={{ marginBottom: 16 }}><h3 style={{ fontSize: 17 }}>{q}</h3><p style={{ color: "#58655d", lineHeight: 1.8 }}>{a}</p></div>)}
        <p style={{ marginTop: 32 }}><Link href="/register" className="marketing-button">Create your menu <ArrowRight size={18} /></Link></p>
      </article>
    </MarketingShell>
  );
}

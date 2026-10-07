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
const MODIFIED = "2026-10-07";

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

const sections: ReadonlyArray<readonly [string, ReadonlyArray<string>]> = [
  ["Why use a QR code menu?", [
    "A printed menu is fixed the moment it leaves the printer. A QR menu points to a page you control, so a sold-out dish, a new special, or a price change is fixed in seconds instead of a reprint.",
    "Guests already carry a phone with a camera, so there is nothing to install. They scan the code, the menu opens in the browser, and they can browse photos and prices at their own pace.",
    "For a small café or restaurant, this also means fewer menus to wipe down, replace, or lose, and one menu that stays consistent across every table.",
  ]],
  ["Tips for printing and placing QR codes", [
    "Print each code at least 3 to 4 cm wide on a matte surface. Glossy laminate reflects light and can make the code harder to scan.",
    "Put a short instruction beside the code, such as “Scan to view the menu and order”, so guests know what to do.",
    "Place the code where guests sit, on the table or a stand, rather than only at the entrance. Test every code with a couple of different phones before service.",
    "Keep a small printed menu behind the counter for guests who prefer paper or have no mobile data.",
  ]],
  ["Mistakes to avoid", [
    "Skipping photos and descriptions. A menu with only names and prices is harder to order from than a printed one.",
    "Deleting dishes that are out of stock. Mark them unavailable instead, so they are easy to bring back.",
    "Printing codes that link to a page you cannot edit. Use a menu you can update online, so the printed code never goes out of date.",
    "Never testing on a real phone. Scan your own code on both Android and iPhone before printing a full batch.",
  ]],
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
        dateModified: MODIFIED,
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
      <article className="marketing-container marketing-prose">
        <h1>How to make a QR code menu for your restaurant or café in Nepal</h1>
        <p className="marketing-lead">A QR code menu lets guests open your menu on their own phone by scanning a code on the table. Here is how to set one up with Menuor, from the first dish to the first order.</p>
        <p className="marketing-byline">By Ayush Shrestha · <time dateTime={PUBLISHED}>3 October 2026</time></p>
        <ol>
          {steps.map(([title, text]) => <li key={title}><h2>{title}</h2><p>{text}</p></li>)}
        </ol>
        {sections.map(([title, paras]) => <section key={title}><h2>{title}</h2>{paras.map((t) => <p key={t}>{t}</p>)}</section>)}
        <p>Want to see what Menuor can do beyond the menu? Explore the <Link href="/features">features</Link> or check the <Link href="/pricing">pricing</Link>.</p>
        <h2>Common questions</h2>
        {faq.map(([q, a]) => <div key={q}><h3>{q}</h3><p>{a}</p></div>)}
        <div className="marketing-actions"><Link href="/register" className="marketing-button">Create your menu <ArrowRight size={16} aria-hidden="true" /></Link></div>
      </article>
    </MarketingShell>
  );
}

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FAQ_ITEMS as questions, PRODUCT_DEFINITION } from "@/lib/marketing-content";
import MarketingShell from "./MarketingShell";
import { features } from "./features";

const steps = [
  ["Add your menu", "Create your restaurant, add categories and dishes with photos and prices, and choose how the menu looks. Update prices and availability whenever you need."],
  ["Print table QR codes", "Generate a QR code for each table and place it where guests sit. The menu opens in the phone’s browser, with no app to install."],
  ["Run service from the dashboard", "Add staff accounts, follow incoming orders on the order board, and respond to waiter calls."],
];

export default function ProductLanding() {
  return (
    <MarketingShell>
      <section className="marketing-container marketing-hero">
        <div>
          <h1>QR menus and table ordering for restaurants in Nepal</h1>
          <p className="marketing-lead">Publish your menu, take orders from the table, and manage your team in one place. Guests scan a QR code and order from their own phone. There is nothing to install.</p>
          <div className="marketing-actions">
            <Link href="/register" className="marketing-button">Create your menu <ArrowRight size={16} aria-hidden="true" /></Link>
            <Link href="/menu/kalash-food-cafe" className="marketing-button marketing-button-secondary">View a live menu</Link>
          </div>
          <p className="marketing-hero-note">Free during launch.</p>
        </div>
        <figure className="marketing-hero-media">
          <div className="marketing-phone"><Image src="/menu-preview.jpg" alt="A restaurant menu on Menuor, shown on a phone with photos, prices, and categories" width={780} height={1514} priority sizes="280px" /></div>
          <figcaption>A live menu published with Menuor</figcaption>
        </figure>
      </section>

      <div className="marketing-facts"><div className="marketing-container marketing-facts-inner">
        <p><strong>No app for guests</strong><span>The menu opens in the phone’s browser</span></p>
        <p><strong>No reprinting</strong><span>Update dishes and prices behind the same QR code</span></p>
        <p><strong>Roles for your team</strong><span>Separate access for waiters, cooks, and chefs</span></p>
      </div></div>

      <section className="marketing-container marketing-section marketing-about" aria-labelledby="about-heading">
        <h2 id="about-heading">What is Menuor?</h2>
        <p>{PRODUCT_DEFINITION}</p>
      </section>

      <section id="features" className="marketing-section marketing-section-alt" aria-labelledby="features-heading"><div className="marketing-container">
        <div className="marketing-section-head"><h2 id="features-heading">Everything a restaurant uses during service</h2><p>Start with a QR menu. Add ordering, staff accounts, and analytics as you need them.</p></div>
        <div className="marketing-feature-grid">{features.map(({ icon: Icon, title, text }) => <article key={title}><div className="marketing-feature-icon"><Icon size={20} aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p></article>)}</div>
      </div></section>

      <section id="how-it-works" className="marketing-container marketing-section" aria-labelledby="how-heading">
        <div className="marketing-section-head"><h2 id="how-heading">Set up in three steps</h2></div>
        <div className="marketing-steps">{steps.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div>
        <p style={{ marginTop: 28 }}>New to QR menus? Read our step-by-step <Link href="/guides/qr-menu-for-restaurants-nepal" style={{ textDecoration: "underline" }}>guide to making a QR code menu for your restaurant or café in Nepal</Link>.</p>
      </section>

      <section id="faq" className="marketing-section marketing-section-alt" aria-labelledby="faq-heading"><div className="marketing-container marketing-faq">
        <div className="marketing-faq-aside"><h2 id="faq-heading">Frequently asked questions</h2><p>Can’t find an answer? <a href="mailto:ayushrestha8585@gmail.com">Email us</a>.</p></div>
        <div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
      </div></section>

      <section className="marketing-container marketing-section" style={{ paddingBottom: 0 }}>
        <div className="marketing-cta"><h2>Put your menu on the table</h2><p>Create your restaurant and print your first QR code today. Free during launch.</p><Link href="/register" className="marketing-button">Create your menu <ArrowRight size={16} aria-hidden="true" /></Link></div>
      </section>
    </MarketingShell>
  );
}

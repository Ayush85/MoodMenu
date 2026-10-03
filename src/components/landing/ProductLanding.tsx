import Link from "next/link";
import { FAQ_ITEMS as questions, PRODUCT_DEFINITION } from "@/lib/marketing-content";
import { ArrowRight, Check, Coffee, UtensilsCrossed, ClipboardList } from "lucide-react";
import MarketingShell from "./MarketingShell";
import { features } from "./features";

export default function ProductLanding() {
  return (
    <MarketingShell>
      <>
        <section className="marketing-container marketing-hero">
          <div>
            <p className="marketing-eyebrow">For restaurants & cafés in Nepal</p>
            <h1>QR menu &amp; ordering<br />for Nepal’s restaurants.<br /><span>One happy service.</span></h1>
            <p className="marketing-lead">{PRODUCT_DEFINITION}</p>
            <div className="marketing-actions"><Link href="/register" className="marketing-button">Create your menu <ArrowRight size={18} /></Link><a href="#product-preview" className="marketing-text-link">Explore the experience <ArrowRight size={17} /></a></div>
            <p className="marketing-note"><Check size={16} /> No app download for guests. Just scan and browse.</p>
          </div>
          <div id="product-preview" className="marketing-preview" aria-label="Illustrative guest menu and kitchen order">
            <div className="marketing-preview-top"><span>A little less busywork.</span><span>A little more hospitality.</span></div>
            <div className="marketing-phone">
              <div className="marketing-phone-notch" />
              <div className="marketing-phone-header"><Coffee size={22} /><span>The Corner Café<small>Kathmandu · Table 04</small></span></div>
              <p className="marketing-phone-greeting">Something delicious<br />starts here.</p>
              <div className="marketing-preview-tabs"><span>Popular</span><span>Momo</span><span>Drinks</span></div>
              {[["Steam momo", "Steamed and served with achar", "Rs. 220"], ["Iced latte", "Espresso, milk, a little chill", "Rs. 180"], ["Veg chow mein", "Wok-tossed noodles & vegetables", "Rs. 190"]].map(([name, description, price], i) => (
                <div className="marketing-preview-dish" key={name}>
                  <div className={"marketing-dish-icon marketing-dish-icon-" + i}>{i === 1 ? <Coffee size={26} /> : <UtensilsCrossed size={26} />}</div>
                  <div><strong>{name}</strong><p>{description}</p><b>{price}</b></div><span className="marketing-preview-plus" aria-hidden="true">+</span>
                </div>
              ))}
              <div className="marketing-preview-order">Your order <span>2 items · Rs. 400</span></div>
            </div>
            <div className="marketing-kitchen-card"><ClipboardList size={24} /><div><strong>Table 04 · New order</strong><p>1 × Steam momo · 1 × Iced latte</p><span>Ready for the kitchen</span></div></div>
            <p className="marketing-preview-caption">Example menu and order · Illustrative data</p>
          </div>
        </section>
        <div className="marketing-benefits"><div className="marketing-container marketing-benefits-inner">
          <p><strong>Scan. Browse. Order.</strong><span>A menu that opens in the browser</span></p>
          <p><strong>Fresh menu, same QR.</strong><span>Update dishes and prices anytime</span></p>
          <p><strong>Everyone on the same page.</strong><span>Orders and roles for your team</span></p>
        </div></div>
        <section id="features" className="marketing-container marketing-section" aria-labelledby="features-heading">
          <div className="marketing-section-heading"><div><p className="marketing-eyebrow">Built for the whole service</p><h2 id="features-heading">A better guest experience.<br /><span>A clearer day for your team.</span></h2></div><p>Start with a QR code digital menu. Bring ordering, staff, and the everyday details of running your restaurant together.</p></div>
          <div className="marketing-feature-grid">{features.map(({ icon: Icon, title, text }, i) => <article key={title}><div className="marketing-feature-top"><Icon size={25} aria-hidden="true" /><span>0{i + 1}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div>
        </section>
        <section id="how-it-works" className="marketing-workflow" aria-labelledby="how-heading"><div className="marketing-container marketing-section">
          <p className="marketing-eyebrow">From setup to service</p><h2 id="how-heading">Your next service,<br /><span>a little simpler.</span></h2>
          <div className="marketing-steps">{[
            ["Make it yours", "Create your restaurant, add your dishes, and choose your menu’s look. Update availability and prices whenever you need."],
            ["Put it on the table", "Create table QR codes and place them where guests can scan. Your menu opens right in their phone’s browser."],
            ["Bring your team together", "Add staff accounts, follow incoming orders, and respond to waiter calls from your restaurant dashboard."],
          ].map(([title, text], i) => <article key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </div></section>
        <section id="faq" className="marketing-container marketing-section marketing-faq" aria-labelledby="faq-heading">
          <div><p className="marketing-eyebrow">Before your first service</p><h2 id="faq-heading">A few good<br /><span>questions.</span></h2><p>Need a hand getting started?<br /><a href="mailto:ayushrestha8585@gmail.com">Talk to us →</a></p></div>
          <div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
        </section>
        <section className="marketing-container marketing-cta"><p className="marketing-eyebrow">Good food deserves a great experience</p><h2>Make room for<br /><span>better service.</span></h2><p>Your menu, your team, and your next order. Bring them together with Menuor.</p><Link href="/register" className="marketing-button">Create your restaurant <ArrowRight size={18} /></Link></section>
      </>
    </MarketingShell>
  );
}

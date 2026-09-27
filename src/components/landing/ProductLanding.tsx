import Link from "next/link";
import { ArrowRight, Check, Coffee, UtensilsCrossed, ClipboardList, QrCode, BellRing, Users, Globe, Palette } from "lucide-react";

const features = [
  { icon: QrCode, title: "A digital menu that feels like you", text: "Organize dishes into categories, add photos and prices, and choose a layout that fits your restaurant. Share it with a QR code or a link." },
  { icon: ClipboardList, title: "From the table to your team", text: "Guests order from their table QR link. Staff follow each order from new to preparing, served, and paid in one order board." },
  { icon: BellRing, title: "Help, one tap away", text: "Let guests call a waiter from the menu. Your team can see and acknowledge requests without a guest having to wave across the room." },
  { icon: Users, title: "The right tools for every role", text: "Give waiters, cooks, and chefs their own accounts. Manage staff access, review sales analytics, and record restaurant expenses." },
  { icon: Globe, title: "Your restaurant, online", text: "Create a restaurant landing page and connect your own domain. Give guests a place to discover your restaurant and explore its menu." },
  { icon: Palette, title: "A little personality", text: "Use weather and time-of-day rules to change themes and feature dishes. Bring warm drinks forward on a rainy evening." },
];

const questions = [
  ["What is Menuor?", "Menuor is restaurant management software built around a QR code digital menu. Restaurants and cafés can publish menus, accept table orders, manage waiter calls and staff roles, record expenses, and review sales analytics."],
  ["Do guests need to download an app?", "No. Guests scan the table QR code with their phone camera and open the menu in their browser. They can browse dishes without creating an account."],
  ["Can I update my menu without printing a new QR code?", "Yes. Changes to dishes, prices, photos, and availability appear on your online menu. You can keep using the same QR code for menu updates."],
  ["How does table ordering work?", "Guests open a table-specific QR link, add dishes, and submit their order. Staff manage it in the dashboard and update its status through service. Restaurants can also configure network restrictions for ordering."],
  ["Is Menuor suitable for restaurants and cafés in Nepal?", "Yes. Menuor supports menu prices in Nepalese rupees, table QR codes, staff accounts, and restaurant locations. Guests access the menu through a web browser."],
  ["Can I use my own branding and domain?", "Yes. Customize your menu’s colors, fonts, and layout, create a restaurant landing page, and connect your domain after setup and verification."],
];

function Brand() {
  return <Link href="/" className="marketing-logo" aria-label="Menuor home">menuor<span>.</span></Link>;
}

export default function ProductLanding() {
  return (
    <div className="marketing">
      <a className="marketing-skip" href="#main-content">Skip to content</a>
      <header className="marketing-nav">
        <nav className="marketing-container marketing-nav-inner" aria-label="Main navigation">
          <Brand />
          <div className="marketing-nav-links"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#faq">FAQs</a></div>
          <div className="marketing-nav-actions"><Link href="/login">Sign in</Link><Link href="/register" className="marketing-button marketing-button-small">Get started <ArrowRight size={16} /></Link></div>
        </nav>
      </header>
      <main id="main-content">
        <section className="marketing-container marketing-hero">
          <div>
            <p className="marketing-eyebrow">For restaurants & cafés in Nepal</p>
            <h1>Your QR menu.<br />Your orders.<br /><span>One happy service.</span></h1>
            <p className="marketing-lead">Give guests a digital menu they can order from. Keep your kitchen, tables, and team connected with restaurant management software built around your everyday service.</p>
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
        <section id="features" className="marketing-container marketing-section">
          <div className="marketing-section-heading"><div><p className="marketing-eyebrow">Built for the whole service</p><h2>A better guest experience.<br /><span>A clearer day for your team.</span></h2></div><p>Start with a QR code digital menu. Bring ordering, staff, and the everyday details of running your restaurant together.</p></div>
          <div className="marketing-feature-grid">{features.map(({ icon: Icon, title, text }, i) => <article key={title}><div className="marketing-feature-top"><Icon size={25} aria-hidden="true" /><span>0{i + 1}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div>
        </section>
        <section id="how-it-works" className="marketing-workflow"><div className="marketing-container marketing-section">
          <p className="marketing-eyebrow">From setup to service</p><h2>Your next service,<br /><span>a little simpler.</span></h2>
          <div className="marketing-steps">{[
            ["Make it yours", "Create your restaurant, add your dishes, and choose your menu’s look. Update availability and prices whenever you need."],
            ["Put it on the table", "Create table QR codes and place them where guests can scan. Your menu opens right in their phone’s browser."],
            ["Bring your team together", "Add staff accounts, follow incoming orders, and respond to waiter calls from your restaurant dashboard."],
          ].map(([title, text], i) => <article key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </div></section>
        <section id="faq" className="marketing-container marketing-section marketing-faq">
          <div><p className="marketing-eyebrow">Before your first service</p><h2>A few good<br /><span>questions.</span></h2><p>Need a hand getting started?<br /><a href="mailto:ayushrestha8585@gmail.com">Talk to us →</a></p></div>
          <div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
        </section>
        <section className="marketing-container marketing-cta"><p className="marketing-eyebrow">Good food deserves a great experience</p><h2>Make room for<br /><span>better service.</span></h2><p>Your menu, your team, and your next order. Bring them together with Menuor.</p><Link href="/register" className="marketing-button">Create your restaurant <ArrowRight size={18} /></Link></section>
      </main>
      <footer className="marketing-footer">
        <div className="marketing-container marketing-footer-top"><div><Brand /><p>Digital menus and restaurant management<br />for cafés and restaurants in Nepal.</p></div><nav aria-label="Footer navigation"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#faq">FAQs</a><Link href="/login">Sign in</Link></nav><div><strong>Let’s talk about your restaurant.</strong><a href="mailto:ayushrestha8585@gmail.com">ayushrestha8585@gmail.com</a><a href="tel:+9779844453285">+977 9844453285</a></div></div>
        <div className="marketing-container marketing-footer-bottom"><span>© {new Date().getFullYear()} Menuor</span><span>Made for the people behind good food.</span></div>
      </footer>
    </div>
  );
}

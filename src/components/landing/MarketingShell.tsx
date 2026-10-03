import Link from "next/link";
import { ArrowRight } from "lucide-react";
import "@/app/marketing.css";

export function Brand() {
  return <Link href="/" className="marketing-logo" aria-label="Menuor home">menuor<span>.</span></Link>;
}

/** Shared header + footer for every public marketing page (home, features, pricing, guides). */
export default function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing">
      <a className="marketing-skip" href="#main-content">Skip to content</a>
      <header className="marketing-nav">
        <nav className="marketing-container marketing-nav-inner" aria-label="Main navigation">
          <Brand />
          <div className="marketing-nav-links"><Link href="/features">Features</Link><Link href="/pricing">Pricing</Link><Link href="/guides/qr-menu-for-restaurants-nepal">Guide</Link><Link href="/#faq">FAQs</Link></div>
          <div className="marketing-nav-actions"><Link href="/login">Sign in</Link><Link href="/register" className="marketing-button marketing-button-small">Get started <ArrowRight size={16} /></Link></div>
        </nav>
      </header>
      <main id="main-content">{children}</main>
      <footer className="marketing-footer">
        <div className="marketing-container marketing-footer-top">
          <div><Brand /><p>Digital menus and restaurant management<br />for cafés and restaurants in Nepal.</p></div>
          <nav aria-label="Footer navigation"><Link href="/features">Features</Link><Link href="/pricing">Pricing</Link><Link href="/guides/qr-menu-for-restaurants-nepal">QR menu guide</Link><Link href="/#faq">FAQs</Link><Link href="/login">Sign in</Link></nav>
          <div><strong>Let’s talk about your restaurant.</strong><a href="mailto:ayushrestha8585@gmail.com">ayushrestha8585@gmail.com</a><a href="tel:+9779844453285">+977 9844453285</a></div>
        </div>
        <div className="marketing-container marketing-footer-bottom"><span>© {new Date().getFullYear()} Menuor</span><span>Made for the people behind good food.</span></div>
      </footer>
    </div>
  );
}

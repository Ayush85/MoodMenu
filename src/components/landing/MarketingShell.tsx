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
          <div className="marketing-nav-links"><Link href="/features">Features</Link><Link href="/pricing">Pricing</Link><Link href="/guides/qr-menu-for-restaurants-nepal">Guide</Link><Link href="/#faq">FAQ</Link></div>
          <div className="marketing-nav-actions"><Link href="/login">Sign in</Link><Link href="/register" className="marketing-button marketing-button-small">Get started <ArrowRight size={15} aria-hidden="true" /></Link></div>
        </nav>
      </header>
      <main id="main-content">{children}</main>
      <footer className="marketing-footer">
        <div className="marketing-container marketing-footer-top">
          <div><Brand /><p>Digital menus and restaurant management software for restaurants and cafés in Nepal.</p></div>
          <nav aria-label="Product"><h4>Product</h4><div className="marketing-footer-col"><Link href="/features">Features</Link><Link href="/pricing">Pricing</Link><Link href="/guides/qr-menu-for-restaurants-nepal">QR menu guide</Link></div></nav>
          <nav aria-label="Account"><h4>Account</h4><div className="marketing-footer-col"><Link href="/login">Sign in</Link><Link href="/register">Create account</Link><Link href="/#faq">FAQ</Link></div></nav>
          <div><h4>Contact</h4><div className="marketing-footer-col"><a href="mailto:ayushrestha8585@gmail.com">ayushrestha8585@gmail.com</a><a href="tel:+9779844453285">+977 9844453285</a></div></div>
        </div>
        <div className="marketing-container marketing-footer-bottom">© {new Date().getFullYear()} Menuor. All rights reserved.</div>
      </footer>
    </div>
  );
}

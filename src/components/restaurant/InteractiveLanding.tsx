"use client";

import { useState, type CSSProperties, type PointerEvent } from "react";
import { ArrowRight, Clock3, Globe, MapPin, Phone, UtensilsCrossed } from "lucide-react";
import type { LandingPageContent, MoodTheme } from "@/types";

interface GalleryItem {
  name: string;
  image: string;
}

interface Props {
  name: string;
  city: string;
  logo: string | null;
  theme: MoodTheme;
  fontFamily?: string;
  content: LandingPageContent | null;
  menuHref: string;
  mapHref: string;
  gallery: GalleryItem[];
}

type SiteStyle = CSSProperties & {
  "--site-primary"?: string;
  "--site-accent"?: string;
  "--site-bg"?: string;
  "--site-text"?: string;
  "--site-tilt"?: string;
};

export default function InteractiveLanding({ name, city, logo, theme, fontFamily, content, menuHref, mapHref, gallery }: Props) {
  const [tilt, setTilt] = useState(0);
  const heroImage = gallery[0]?.image;
  const tagline = content?.tagline || `Welcome to ${name}`;
  const about = content?.about || `${name} is located in ${city}.`;
  const highlights = content?.highlights?.filter(Boolean) ?? [];
  const ctaText = content?.ctaText || "View our menu";

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setTilt(((event.clientX - bounds.left) / bounds.width - 0.5) * 2.5);
  }

  const style: SiteStyle = {
    backgroundColor: theme.bg,
    color: theme.text,
    fontFamily,
    "--site-primary": theme.primary,
    "--site-accent": theme.accent,
    "--site-bg": theme.bg,
    "--site-text": theme.text,
    "--site-tilt": `${tilt}deg`,
  };

  return (
    <main className="restaurant-site" style={style}>
      <header className="restaurant-site__hero" style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}>
        <div className="restaurant-site__hero-overlay" />
        <nav className="restaurant-site__nav">
          <a href="#top" className="restaurant-site__brand" aria-label={`${name} home`}>
            {logo ? <img src={logo} alt="" /> : <span className="restaurant-site__brand-placeholder"><UtensilsCrossed className="h-4 w-4" /></span>}
            <span>{name}</span>
          </a>
          <div className="restaurant-site__nav-links">
            <a href="#about">Our story</a>
            {gallery.length > 0 && <a href="#gallery">Gallery</a>}
            <a href={menuHref} className="restaurant-site__nav-button">Menu <ArrowRight className="h-3.5 w-3.5" /></a>
          </div>
        </nav>

        <div id="top" className="restaurant-site__hero-content">
          <span className="restaurant-site__eyebrow">{city} · Restaurant &amp; Cafe</span>
          {logo && <img src={logo} alt={name} className="restaurant-site__hero-logo" />}
          <h1>{name}</h1>
          <p>{tagline}</p>
          <div className="restaurant-site__hero-actions">
            <a href={menuHref} className="restaurant-site__button"><UtensilsCrossed className="h-4 w-4" /> {ctaText}</a>
            <a href={mapHref} target="_blank" rel="noopener noreferrer" className="restaurant-site__text-button"><MapPin className="h-4 w-4" /> Find us</a>
          </div>
        </div>
        <a href="#about" className="restaurant-site__scroll-cue">Scroll to explore <ArrowRight className="h-3.5 w-3.5 rotate-90" /></a>
      </header>

      <section className="restaurant-site__info-bar">
        <div><MapPin className="h-4 w-4" /><span>{content?.address || city}</span></div>
        {content?.hours && <div><Clock3 className="h-4 w-4" /><span>{content.hours}</span></div>}
        {content?.phone && <div><Phone className="h-4 w-4" /><span>{content.phone}</span></div>}
      </section>

      <section id="about" className="restaurant-site__story">
        <div className="restaurant-site__section-label">Our story</div>
        <div className="restaurant-site__story-copy">
          <h2>Good food.<br /><em>Good company.</em></h2>
          <div>
            <p>{about}</p>
            <a href={menuHref} className="restaurant-site__inline-link">Explore the menu <ArrowRight className="h-4 w-4" /></a>
          </div>
        </div>
      </section>

      {highlights.length > 0 && (
        <section className="restaurant-site__highlights">
          {highlights.map((highlight, index) => <article key={`${highlight}-${index}`}><span>0{index + 1}</span><p>{highlight}</p></article>)}
        </section>
      )}

      {gallery.length > 0 && (
        <section id="gallery" className="restaurant-site__gallery">
          <div className="restaurant-site__section-heading"><div><div className="restaurant-site__section-label">From the kitchen</div><h2>A taste of {name}</h2></div><a href={menuHref} className="restaurant-site__inline-link">View menu <ArrowRight className="h-4 w-4" /></a></div>
          <div className="restaurant-site__gallery-grid" onPointerMove={handlePointerMove} onPointerLeave={() => setTilt(0)}>
            {gallery.map((item, index) => <figure key={`${item.name}-${index}`} className={`restaurant-site__gallery-item restaurant-site__gallery-item--${index % 3}`}><img src={item.image} alt={item.name} /><figcaption>{item.name}</figcaption></figure>)}
          </div>
        </section>
      )}

      <footer className="restaurant-site__footer">
        <div className="restaurant-site__footer-main"><div className="restaurant-site__section-label">Make a reservation in your mind</div><h2>Come as you are.<br /><em>Leave well fed.</em></h2><a href={menuHref} className="restaurant-site__button">{ctaText} <ArrowRight className="h-4 w-4" /></a></div>
        <div className="restaurant-site__footer-contact">
          <strong>{name}</strong>
          <a href={mapHref} target="_blank" rel="noopener noreferrer"><MapPin className="h-4 w-4" /> {content?.address || city}</a>
          {content?.phone && <a href={`tel:${content.phone}`}><Phone className="h-4 w-4" /> {content.phone}</a>}
          {content?.instagram && <a href={content.instagram} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4" /> Instagram</a>}
          {content?.facebook && <a href={content.facebook} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4" /> Facebook</a>}
        </div>
        <div className="restaurant-site__footer-bottom"><span>{name} · {city}</span><span>Powered by Menuor</span></div>
      </footer>
    </main>
  );
}

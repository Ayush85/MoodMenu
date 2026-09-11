"use client";

import { useState, type CSSProperties, type PointerEvent } from "react";
import { ArrowUpRight, Clock3, Globe, MapPin, Phone, Sparkles, UtensilsCrossed } from "lucide-react";
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
  content: LandingPageContent | null;
  menuHref: string;
  mapHref: string;
  gallery: GalleryItem[];
}

type LandingStyle = CSSProperties & {
  "--landing-primary"?: string;
  "--landing-accent"?: string;
  "--landing-bg"?: string;
  "--landing-text"?: string;
  "--landing-rx"?: string;
  "--landing-ry"?: string;
};

export default function InteractiveLanding({ name, city, logo, theme, content, menuHref, mapHref, gallery }: Props) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const tagline = content?.tagline || `Welcome to ${name}`;
  const about = content?.about || `${name} is located in ${city}.`;
  const highlights = content?.highlights?.filter(Boolean) ?? [];
  const ctaText = content?.ctaText || "View Menu";

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setTilt({
      x: ((event.clientY - bounds.top) / bounds.height - 0.5) * -7,
      y: ((event.clientX - bounds.left) / bounds.width - 0.5) * 7,
    });
  }

  const style: LandingStyle = {
    backgroundColor: theme.bg,
    color: theme.text,
    "--landing-primary": theme.primary,
    "--landing-accent": theme.accent,
    "--landing-bg": theme.bg,
    "--landing-text": theme.text,
    "--landing-rx": `${tilt.x}deg`,
    "--landing-ry": `${tilt.y}deg`,
  };

  return (
    <main className="restaurant-landing" style={style}>
      <div className="restaurant-landing__noise" aria-hidden="true" />
      <div className="restaurant-landing__orb restaurant-landing__orb--one" aria-hidden="true" />
      <div className="restaurant-landing__orb restaurant-landing__orb--two" aria-hidden="true" />

      <nav className="restaurant-landing__nav landing-reveal">
        <a href="#top" className="restaurant-landing__brand" aria-label={`${name} home`}>
          {logo ? <img src={logo} alt="" className="restaurant-landing__brand-mark" /> : <span className="restaurant-landing__brand-dot" />}
          <span>{name}</span>
        </a>
        <a href={menuHref} className="restaurant-landing__nav-cta">
          Menu <ArrowUpRight className="h-4 w-4" />
        </a>
      </nav>

      <section id="top" className="restaurant-landing__hero landing-reveal landing-reveal--one">
        <div className="restaurant-landing__hero-copy">
          <div className="restaurant-landing__eyebrow"><Sparkles className="h-3.5 w-3.5" /> Crafted for your next craving</div>
          <h1>{name}</h1>
          <p className="restaurant-landing__tagline">{tagline}</p>
          <div className="restaurant-landing__location"><MapPin className="h-4 w-4" /> {city}</div>
          <a href={menuHref} className="restaurant-landing__primary-cta">
            <UtensilsCrossed className="h-5 w-5" /> {ctaText} <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        <div className="restaurant-landing__stage" onPointerMove={handlePointerMove} onPointerLeave={() => setTilt({ x: 0, y: 0 })}>
          <div className="restaurant-landing__stage-ring" aria-hidden="true" />
          <div className="restaurant-landing__hero-card">
            <div className="restaurant-landing__hero-card-top">
              <span>EST. {city.toUpperCase()}</span>
              <span className="restaurant-landing__status"><i /> Open for good taste</span>
            </div>
            <div className="restaurant-landing__hero-card-content">
              {logo ? <img src={logo} alt={name} className="restaurant-landing__hero-logo" /> : <div className="restaurant-landing__hero-logo restaurant-landing__hero-logo--empty"><UtensilsCrossed /></div>}
              <span className="restaurant-landing__hero-card-label">A table worth remembering</span>
              <strong>{name}</strong>
            </div>
            <div className="restaurant-landing__hero-card-bottom"><span>Swipe into flavour</span><ArrowUpRight className="h-4 w-4" /></div>
          </div>
          <div className="restaurant-landing__floating-chip restaurant-landing__floating-chip--top"><span>01</span> Freshly made</div>
          <div className="restaurant-landing__floating-chip restaurant-landing__floating-chip--bottom"><span>✦</span> Made with care</div>
        </div>
      </section>

      <section className="restaurant-landing__intro landing-reveal landing-reveal--two">
        <span className="restaurant-landing__section-kicker">The story behind the table</span>
        <h2>Come hungry.<br /><em>Leave inspired.</em></h2>
        <p>{about}</p>
      </section>

      {highlights.length > 0 && (
        <section className="restaurant-landing__highlights landing-reveal landing-reveal--three">
          {highlights.map((highlight, index) => (
            <article key={`${highlight}-${index}`} className="restaurant-landing__highlight">
              <span>0{index + 1}</span>
              <p>{highlight}</p>
            </article>
          ))}
        </section>
      )}

      {gallery.length > 0 && (
        <section className="restaurant-landing__gallery landing-reveal landing-reveal--three">
          <div className="restaurant-landing__section-heading"><div><span className="restaurant-landing__section-kicker">A taste of what&apos;s ahead</span><h2>From our menu</h2></div><a href={menuHref}>Explore all <ArrowUpRight className="h-4 w-4" /></a></div>
          <div className="restaurant-landing__gallery-grid">
            {gallery.map((item, index) => <figure key={`${item.name}-${index}`} className={`restaurant-landing__gallery-item restaurant-landing__gallery-item--${index % 3}`}><img src={item.image} alt={item.name} /><figcaption>{item.name}</figcaption></figure>)}
          </div>
        </section>
      )}

      <footer className="restaurant-landing__footer">
        <div className="restaurant-landing__footer-main">
          <span className="restaurant-landing__section-kicker">Find your way to us</span>
          <h2>Make it a<br /><em>delicious day.</em></h2>
          <a href={menuHref} className="restaurant-landing__primary-cta">{ctaText} <ArrowUpRight className="h-4 w-4" /></a>
        </div>
        <div className="restaurant-landing__contact">
          <a href={mapHref}><MapPin className="h-4 w-4" /> {content?.address || city}</a>
          {content?.phone && <a href={`tel:${content.phone}`}><Phone className="h-4 w-4" /> {content.phone}</a>}
          {content?.hours && <span><Clock3 className="h-4 w-4" /> {content.hours}</span>}
          {content?.instagram && <a href={content.instagram} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4" /> Instagram</a>}
          {content?.facebook && <a href={content.facebook} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4" /> Facebook</a>}
        </div>
        <div className="restaurant-landing__footer-line"><span>{name} · {city}</span><span>Powered by Menuor</span></div>
      </footer>
    </main>
  );
}

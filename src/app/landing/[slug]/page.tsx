import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DEFAULT_THEME, DEFAULT_LANDING_CTA, MoodTheme, LandingPageContent, getFontOption } from "@/types";
import { MapPin, Phone, Clock, Globe, UtensilsCrossed } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getRestaurant(slug: string) {
  return prisma.restaurant.findUnique({
    where: { slug },
    select: {
      name: true,
      city: true,
      logo: true,
      customDomain: true,
      brandTheme: true,
      landingEnabled: true,
      landingPage: true,
      latitude: true,
      longitude: true,
      categories: {
        orderBy: { order: "asc" },
        select: {
          items: {
            where: { isAvailable: true, image: { not: null } },
            orderBy: { order: "asc" },
            select: { name: true, image: true },
            take: 4,
          },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getRestaurant(slug);

  if (!restaurant || !restaurant.landingEnabled) {
    return { title: "Not Found", robots: { index: false } };
  }

  const content = restaurant.landingPage as unknown as LandingPageContent | null;
  const title = `${restaurant.name} — ${restaurant.city}`;
  const description = content?.about || content?.tagline || `Welcome to ${restaurant.name} in ${restaurant.city}.`;
  const canonicalUrl = restaurant.customDomain
    ? `https://${restaurant.customDomain}/`
    : `${process.env.APP_BASE_URL || "https://menuor.com"}/landing/${slug}`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonicalUrl,
      ...(restaurant.logo ? { images: [{ url: restaurant.logo, alt: restaurant.name }] } : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
      ...(restaurant.logo ? { images: [restaurant.logo] } : {}),
    },
  };
}

export default async function LandingPage({ params }: Props) {
  const { slug } = await params;
  const restaurant = await getRestaurant(slug);

  if (!restaurant) notFound();
  if (!restaurant.landingEnabled) redirect(`/menu/${slug}`);

  const content = restaurant.landingPage as unknown as LandingPageContent | null;
  const theme: MoodTheme = { ...DEFAULT_THEME, ...(restaurant.brandTheme as unknown as Partial<MoodTheme> | null) };
  const fontOption = getFontOption(theme.fontFamily);
  const isDark = theme.mode === "dark";

  const tagline = content?.tagline || `Welcome to ${restaurant.name}`;
  const about = content?.about || `${restaurant.name} is located in ${restaurant.city}.`;
  const highlights = content?.highlights?.filter(Boolean) ?? [];
  const ctaText = content?.ctaText || DEFAULT_LANDING_CTA;
  const menuHref = restaurant.customDomain ? `https://${restaurant.customDomain}/menu` : `/menu/${slug}`;
  const mapHref =
    restaurant.latitude != null && restaurant.longitude != null
      ? `https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}`
      : `https://www.google.com/maps/search/${encodeURIComponent(`${restaurant.name} ${restaurant.city}`)}`;

  const gallery = restaurant.categories
    .flatMap((cat) => cat.items)
    .filter((item): item is { name: string; image: string } => !!item.image)
    .slice(0, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    description: about,
    address: { "@type": "PostalAddress", addressLocality: restaurant.city, ...(content?.address ? { streetAddress: content.address } : {}), addressCountry: "NP" },
    ...(restaurant.logo ? { image: restaurant.logo } : {}),
    ...(content?.phone ? { telephone: content.phone } : {}),
    url: restaurant.customDomain ? `https://${restaurant.customDomain}/` : `${process.env.APP_BASE_URL || "https://menuor.com"}/landing/${slug}`,
  };

  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text, fontFamily: fontOption?.cssFamily }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {fontOption && <link rel="stylesheet" href={fontOption.stylesheetUrl} />}

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? `linear-gradient(160deg, ${theme.primary}30, ${theme.bg} 75%)`
              : `linear-gradient(160deg, ${theme.primary}20, ${theme.accent}25, ${theme.bg} 85%)`,
          }}
        />
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: theme.primary }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: theme.accent }}
        />

        <div className="relative max-w-3xl mx-auto px-6 pt-20 pb-24 text-center flex flex-col items-center">
          {restaurant.logo && (
            <img
              src={restaurant.logo}
              alt={restaurant.name}
              className="w-20 h-20 rounded-2xl object-cover mb-6 shadow-lg"
            />
          )}
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">{restaurant.name}</h1>
          <p className="mt-4 text-lg sm:text-xl opacity-80 max-w-xl">{tagline}</p>
          <div className="mt-2 flex items-center gap-1.5 text-sm opacity-60">
            <MapPin className="w-4 h-4" />
            {restaurant.city}
          </div>

          <a
            href={menuHref}
            className="mt-8 inline-flex items-center gap-2 text-base font-bold px-8 py-3.5 rounded-full transition hover:opacity-90"
            style={{ backgroundColor: theme.primary, color: "#fff", boxShadow: `0 8px 24px ${theme.primary}40` }}
          >
            <UtensilsCrossed className="w-5 h-5" />
            {ctaText}
          </a>
        </div>

        <svg viewBox="0 0 1440 24" fill="none" className="w-full block -mb-px" style={{ color: theme.bg }}>
          <path d="M0 24h1440V8c-120 8-320 16-720 16S120 16 0 8v16z" fill="currentColor" />
        </svg>
      </header>

      {/* About */}
      <section className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-lg leading-relaxed opacity-90">{about}</p>
      </section>

      {/* Highlights */}
      {highlights.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {highlights.map((highlight, i) => (
              <div
                key={i}
                className="rounded-2xl p-5 text-center"
                style={{ backgroundColor: theme.accent + "20", border: `1px solid ${theme.accent}40` }}
              >
                <p className="text-sm font-semibold">{highlight}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {gallery.map((item, i) => (
              <div key={i} className="aspect-square rounded-2xl overflow-hidden">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contact / footer */}
      <footer
        className="px-6 py-14"
        style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}
      >
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm opacity-80">
            <a href={mapHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:opacity-100">
              <MapPin className="w-4 h-4" />
              {content?.address || restaurant.city}
            </a>
            {content?.phone && (
              <a href={`tel:${content.phone}`} className="flex items-center gap-1.5 hover:opacity-100">
                <Phone className="w-4 h-4" />
                {content.phone}
              </a>
            )}
            {content?.hours && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {content.hours}
              </span>
            )}
          </div>

          {(content?.instagram || content?.facebook) && (
            <div className="flex items-center gap-4 text-sm">
              {content?.instagram && (
                <a href={content.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 opacity-70 hover:opacity-100">
                  <Globe className="w-4 h-4" /> Instagram
                </a>
              )}
              {content?.facebook && (
                <a href={content.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 opacity-70 hover:opacity-100">
                  <Globe className="w-4 h-4" /> Facebook
                </a>
              )}
            </div>
          )}

          <a
            href={menuHref}
            className="mt-2 inline-flex items-center gap-2 text-sm font-bold px-6 py-2.5 rounded-full"
            style={{ backgroundColor: theme.primary, color: "#fff" }}
          >
            {ctaText}
          </a>

          <p className="text-xs opacity-40 mt-4">Powered by Menuor</p>
        </div>
      </footer>
    </div>
  );
}

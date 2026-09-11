import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getRestaurantLandingUrl, getRestaurantMenuUrl } from "@/lib/restaurant-site";
import { DEFAULT_THEME, MoodTheme, LandingPageContent, getFontOption } from "@/types";
import InteractiveLanding from "@/components/restaurant/InteractiveLanding";

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
      domainVerifiedAt: true,
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
  const canonicalUrl = getRestaurantLandingUrl({ ...restaurant, slug });
  const logoUrl = restaurant.logo ? new URL(restaurant.logo, canonicalUrl).toString() : undefined;

  return {
    title,
    description,
    ...(logoUrl ? { icons: { icon: logoUrl, apple: logoUrl } } : {}),
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

  const about = content?.about || `${restaurant.name} is located in ${restaurant.city}.`;
  const canonicalUrl = getRestaurantLandingUrl({ ...restaurant, slug });
  const menuHref = getRestaurantMenuUrl({ ...restaurant, slug });
  const mapHref =
    restaurant.latitude != null && restaurant.longitude != null
      ? `https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}`
      : `https://www.google.com/maps/search/${encodeURIComponent(`${restaurant.name} ${restaurant.city}`)}`;

  const gallery = restaurant.categories
    .flatMap((cat) => cat.items)
    .filter((item): item is { name: string; image: string } => !!item.image)
    .slice(0, 6);

  const sameAs = [content?.instagram, content?.facebook].filter((v): v is string => !!v);
  const absoluteMenuHref = menuHref;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    description: about,
    address: { "@type": "PostalAddress", addressLocality: restaurant.city, ...(content?.address ? { streetAddress: content.address } : {}), addressCountry: "NP" },
    ...(restaurant.logo ? { image: restaurant.logo } : {}),
    ...(content?.phone ? { telephone: content.phone } : {}),
    ...(restaurant.latitude != null && restaurant.longitude != null
      ? { geo: { "@type": "GeoCoordinates", latitude: restaurant.latitude, longitude: restaurant.longitude } }
      : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    hasMenu: absoluteMenuHref,
    url: canonicalUrl,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {fontOption && <link rel="stylesheet" href={fontOption.stylesheetUrl} />}
      <InteractiveLanding
        name={restaurant.name}
        city={restaurant.city}
        logo={restaurant.logo}
        theme={theme}
        content={content}
        menuHref={menuHref}
        mapHref={mapHref}
        gallery={gallery}
      />
    </>
  );
}

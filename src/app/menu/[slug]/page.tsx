import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getWeather } from "@/lib/weather";
import { evaluateMood } from "@/lib/mood-engine";
import { MoodCondition, MoodTheme, DEFAULT_THEME, MOOD_PRESETS, getFontOption } from "@/types";
import MenuClient from "@/components/menu/MenuClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string; wifi?: string; preview?: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { name: true, city: true, logo: true },
  });

  if (!restaurant) {
    return { title: "Menu Not Found", robots: { index: false } };
  }

  const title = `${restaurant.name} Menu`;
  const description = `Browse the full menu at ${restaurant.name} in ${restaurant.city}. Order food and call your waiter directly from your phone.`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title,
      description,
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

function getTimeGreetingFromHour(hour: number): string {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Late Night Menu";
}

export default async function PublicMenuPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { table: tableParam, wifi: wifiParam, preview: previewParam } = await searchParams;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      categories: {
        orderBy: { order: "asc" },
        include: {
          items: {
            where: { isAvailable: true },
            orderBy: { order: "asc" },
          },
        },
      },
      moodRules: { orderBy: { priority: "desc" } },
    },
  });

  if (!restaurant) notFound();

  // Fetch weather & evaluate mood
  const weather = await getWeather({
    city: restaurant.city,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
  });

  const rules = restaurant.moodRules.map((r) => ({
    name: r.name,
    condition: r.condition as unknown as MoodCondition,
    theme: r.theme as unknown as MoodTheme,
    featuredTags: r.featuredTags,
    priority: r.priority,
  }));

  let mood = evaluateMood(rules, weather, restaurant.brandTheme as unknown as Partial<MoodTheme> | null);

  // Preview mode: override theme with a named preset for demo/testing
  const previewPreset = previewParam ? MOOD_PRESETS[previewParam] : null;
  if (previewPreset) {
    mood = {
      theme: previewPreset.theme,
      featuredTags: previewPreset.featuredTags,
      ruleName: previewPreset.name,
      weather: mood.weather,
    };
  }

  const greeting = getTimeGreetingFromHour(new Date().getHours());

  // Identify featured items
  const allItems = restaurant.categories.flatMap((cat) => cat.items);

  const featuredItems = allItems
    .filter((item) =>
      mood.featuredTags.some((tag) =>
        item.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase())
      )
    )
    .slice(0, 6);

  // Today's Specials: only items explicitly marked by admin
  const todaysSpecials = allItems
    .filter((item) => item.isSpecial)
    .slice(0, 6);

  const theme = mood.theme || DEFAULT_THEME;
  const baseUrl = process.env.APP_BASE_URL || "https://menuor.com";

  const menuItems = restaurant.categories.flatMap((cat) =>
    cat.items.map((item) => ({
      "@type": "MenuItem",
      name: item.name,
      description: item.description ?? undefined,
      offers: {
        "@type": "Offer",
        price: item.price.toFixed(2),
        priceCurrency: "NPR",
        availability: "https://schema.org/InStock",
      },
    }))
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    address: {
      "@type": "PostalAddress",
      addressLocality: restaurant.city,
      addressCountry: "NP",
    },
    ...(restaurant.logo ? { image: restaurant.logo } : {}),
    url: `${baseUrl}/menu/${restaurant.slug}`,
    servesCuisine: "Various",
    hasMenu: {
      "@type": "Menu",
      hasMenuSection: restaurant.categories.map((cat) => ({
        "@type": "MenuSection",
        name: cat.name,
        hasMenuItem: cat.items.map((item) => ({
          "@type": "MenuItem",
          name: item.name,
          description: item.description ?? undefined,
          offers: {
            "@type": "Offer",
            price: item.price.toFixed(2),
            priceCurrency: "NPR",
            availability: "https://schema.org/InStock",
          },
        })),
      })),
    },
    ...(menuItems.length > 0 ? { menu: menuItems } : {}),
  };

  const fontOption = getFontOption(theme.fontFamily);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {fontOption && <link rel="stylesheet" href={fontOption.stylesheetUrl} />}
      <MenuClient
      cardStyle={restaurant.cardStyle as "list" | "grid"}
      layoutTemplate={restaurant.layoutTemplate as "classic" | "tabbed" | "magazine"}
      fontFamily={fontOption?.cssFamily}
      restaurant={{
        name: restaurant.name,
        city: restaurant.city,
        logo: restaurant.logo,
        slug: restaurant.slug,
        wifiSsid: restaurant.wifiSsid,
        wifiPassword: restaurant.wifiPassword,
      }}
      categories={restaurant.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        items: cat.items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          image: item.image,
          tags: item.tags,
        })),
      }))}
      featuredItems={featuredItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        tags: item.tags,
      }))}
      todaysSpecials={todaysSpecials.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        tags: item.tags,
      }))}
      theme={theme}
      weather={mood.weather}
      ruleName={mood.ruleName}
      greeting={greeting}
      tableNumber={tableParam ? parseInt(tableParam) : null}
      autoOpenWifiPrompt={wifiParam === "1"}
      previewMode={!!previewPreset}
    />
    </>
  );
}

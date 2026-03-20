import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getWeather } from "@/lib/weather";
import { evaluateMood } from "@/lib/mood-engine";
import { MoodCondition, MoodTheme, DEFAULT_THEME } from "@/types";
import MenuClient from "@/components/menu/MenuClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PublicMenuPage({ params }: Props) {
  const { slug } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      categories: {
        orderBy: { order: "asc" },
        include: {
          items: {
            where: { isAvailable: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      moodRules: { orderBy: { priority: "desc" } },
    },
  });

  if (!restaurant) notFound();

  // Fetch weather & evaluate mood
  const weather = await getWeather(restaurant.city);

  const rules = restaurant.moodRules.map((r) => ({
    name: r.name,
    condition: r.condition as unknown as MoodCondition,
    theme: r.theme as unknown as MoodTheme,
    featuredTags: r.featuredTags,
    priority: r.priority,
  }));

  const mood = evaluateMood(rules, weather);

  // Identify featured items
  const featuredItems = restaurant.categories
    .flatMap((cat) => cat.items)
    .filter((item) =>
      mood.featuredTags.some((tag) =>
        item.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase())
      )
    )
    .slice(0, 6);

  const theme = mood.theme || DEFAULT_THEME;

  return (
    <MenuClient
      restaurant={{
        name: restaurant.name,
        city: restaurant.city,
        logo: restaurant.logo,
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
      theme={theme}
      weather={mood.weather}
      ruleName={mood.ruleName}
    />
  );
}

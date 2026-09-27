import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";

const SEARCH_STOP_WORDS = new Set([
  "a", "an", "and", "dish", "food", "fresh", "image", "on", "photo", "plate", "the", "with",
  "close", "up", "style", "served", "serving", "bowl", "glass",
]);

const FOOD_ALIASES: Record<string, string[]> = {
  bara: ["lentil", "pancake"],
  chatamari: ["rice", "crepe", "pizza"],
  chowmein: ["chow", "mein", "noodle", "noodles"],
  chiya: ["tea"],
  choila: ["grilled", "spiced", "meat"],
  cmo: ["momo", "dumpling", "dumplings"],
  lassi: ["yogurt", "drink"],
  momo: ["dumpling", "dumplings"],
  sekuwa: ["grilled", "barbecue", "bbq", "meat"],
  sel: ["rice", "donut", "doughnut"],
  thukpa: ["noodle", "noodles", "soup"],
  yomari: ["rice", "dumpling", "sweet"],
};

function tokenize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^-+|-+$/g, ""))
    .filter((word) => word.length > 2 && !SEARCH_STOP_WORDS.has(word));
}

function wordForms(word: string) {
  const forms = new Set([word]);
  if (word.endsWith("ies")) forms.add(`${word.slice(0, -3)}y`);
  if (word.endsWith("s")) forms.add(word.slice(0, -1));
  else forms.add(`${word}s`);
  for (const alias of FOOD_ALIASES[word] || []) forms.add(alias);
  return forms;
}

export function normalizeStockQuery(value: string) {
  return value
    .replace(/```[a-z]*|```/gi, "")
    .replace(/["“”'.,:;!?()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 8)
    .join(" ");
}

export function buildFallbackStockQuery(name: string, description: string | null) {
  const nameWords = tokenize(name).slice(0, 4);
  const descriptionWords = description ? tokenize(description).slice(0, 6) : [];
  const words = [...nameWords, ...descriptionWords.filter((word) => !nameWords.includes(word))];
  return normalizeStockQuery(words.join(" ")) || normalizeStockQuery(name);
}

export async function getStockSearchQuery(
  name: string,
  description: string | null,
  city: string | null
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return buildFallbackStockQuery(name, description);

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 40,
      messages: [
        {
          role: "user",
          content: `This is a menu item from a restaurant${city ? ` in ${city}, Nepal` : ""}. Item: "${name}"${description ? ` — ${description}` : ""}.
Return ONLY a short English search phrase (3-6 words, no punctuation) describing the actual dish or product (main ingredient/type + how it's prepared) for finding a matching photo on a general stock photography site. Translate local-language dish names into their real English description rather than transliterating them. If you are not confident what this item actually is, return exactly the single word "unknown" instead of guessing.`,
        },
      ],
    });

    const block = response.content.find((b) => b.type === "text");
    const text = block && "text" in block ? normalizeStockQuery(block.text) : "";
    if (!text || text.toLowerCase() === "unknown") return null;
    return text;
  } catch (error) {
    logger.warn("stock_photos.claude_query_failed", { error, itemName: name });
    return buildFallbackStockQuery(name, description);
  }
}

export interface StockPhotoResult {
  url: string;
  alt: string;
}

export function rankRelevantStockPhotos(query: string, photos: StockPhotoResult[]): StockPhotoResult[] {
  const queryWords = tokenize(query);
  if (queryWords.length === 0) return [];

  return photos
    .map((photo, index) => {
      const altWords = new Set(tokenize(photo.alt));
      const matchedAltWords = new Set<string>();
      for (const word of queryWords) {
        for (const form of wordForms(word)) {
          if (altWords.has(form)) matchedAltWords.add(form);
        }
      }
      const normalizedAlt = photo.alt.toLowerCase();
      const normalizedQuery = queryWords.join(" ");
      const exactPhraseBonus = normalizedAlt.includes(normalizedQuery) ? 1 : 0;
      const matchCount = matchedAltWords.size;
      const score = matchCount / queryWords.length + exactPhraseBonus;
      return { photo, index, matchCount, score };
    })
    .filter(({ matchCount, score }) => score > 0 && matchCount >= Math.min(2, queryWords.length))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ photo }) => photo);
}

export async function searchPexelsPhotos(query: string, perPage = 8): Promise<StockPhotoResult[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];

  // Bias toward tight, food-focused shots rather than wide table/restaurant
  // scenes — Pexels has no composition filter, so this has to ride the query.
  const normalizedQuery = normalizeStockQuery(query);
  const searchQuery = `${normalizedQuery} close up`;

  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=${perPage}&orientation=square`,
    { headers: { Authorization: apiKey } }
  );
  if (!res.ok) {
    logger.warn("stock_photos.pexels_search_failed", { status: res.status, query: searchQuery });
    return [];
  }

  const data = await res.json();
  const photos: { alt?: string; src?: { large?: string; medium?: string } }[] = data.photos || [];

  const candidates = photos
    .map((p) => ({ url: p.src?.large || p.src?.medium || "", alt: p.alt?.trim() || "" }))
    .filter((p) => p.url);

  return rankRelevantStockPhotos(normalizedQuery, candidates);
}

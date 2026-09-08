import Anthropic from "@anthropic-ai/sdk";

export async function getStockSearchQuery(
  name: string,
  description: string | null,
  city: string | null
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return name;

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
    const text = block && "text" in block ? block.text.trim() : "";
    if (!text || text.toLowerCase() === "unknown") return null;
    return text;
  } catch {
    return name;
  }
}

export interface StockPhotoResult {
  url: string;
  alt: string;
}

export async function searchPexelsPhotos(query: string, perPage = 8): Promise<StockPhotoResult[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];

  // Bias toward tight, food-focused shots rather than wide table/restaurant
  // scenes — Pexels has no composition filter, so this has to ride the query.
  const searchQuery = `${query} close up`;

  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=${perPage}&orientation=square`,
    { headers: { Authorization: apiKey } }
  );
  if (!res.ok) return [];

  const data = await res.json();
  const photos: { alt?: string; src?: { large?: string; medium?: string } }[] = data.photos || [];

  return photos
    .map((p) => ({ url: p.src?.large || p.src?.medium || "", alt: p.alt || query }))
    .filter((p) => p.url);
}

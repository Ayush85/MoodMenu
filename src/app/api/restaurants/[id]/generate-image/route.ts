import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadImage } from "@/lib/storage";
import OpenAI from "openai";
import { GoogleGenAI, Modality } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";

function buildPrompt(name: string, description?: string | null) {
  return `A photorealistic professional product photograph of "${name}"${
    description ? `, ${description}` : ""
  }, exactly as it would appear listed on a restaurant/bar menu.
If this is a food or beverage dish, present it freshly plated or poured with appropriate garnish, natural steam if served hot, on a simple ceramic plate, bowl, or glass, 45-degree or top-down angle, editorial food-magazine quality.
If this is a packaged or retail product (e.g. cigarettes, snacks, bottled goods), photograph the actual product/packaging as it is normally sold, on a clean neutral background — do not turn it into a food dish.
Captured on a DSLR camera with a macro lens, soft natural lighting, shallow depth of field, realistic specular highlights, true-to-life textures and colors. This must look like an actual camera photograph, not digital art — do not render it as an illustration, cartoon, anime, 3D render, CGI, painting, sketch, or plastic-looking/artificial image. No watermark, no hands.`;
}

async function getStockSearchQuery(name: string, description: string | null, city: string | null): Promise<string | null> {
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

async function searchStockPhoto(name: string, description: string | null, city: string | null): Promise<Buffer | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  const query = await getStockSearchQuery(name, description, city);
  if (!query) return null; // Claude wasn't confident what this item is — go straight to AI

  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=square`,
    { headers: { Authorization: apiKey } }
  );
  if (!res.ok) return null;

  const data = await res.json();
  const photos: { alt?: string; src?: { large?: string } }[] = data.photos || [];
  if (photos.length === 0) return null;

  // Pexels returns its "closest" match even when nothing is actually relevant
  // (e.g. searching "Buff Tass" once returned an unrelated portrait). Only
  // trust a result whose own description shares a real word with the query.
  const queryWords = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);

  const relevantPhoto = photos.find((p) => {
    const alt = (p.alt || "").toLowerCase();
    return queryWords.some((w) => alt.includes(w));
  });

  const photoUrl = relevantPhoto?.src?.large;
  if (!photoUrl) return null;

  const imgRes = await fetch(photoUrl);
  if (!imgRes.ok) return null;

  return Buffer.from(await imgRes.arrayBuffer());
}

async function generateWithOpenAI(prompt: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const client = new OpenAI({ apiKey });
  const response = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024",
    quality: "high",
    n: 1,
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned from OpenAI");

  return Buffer.from(b64, "base64");
}

async function generateWithGemini(prompt: string): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
    config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
  });

  const data = response.data;
  if (!data) throw new Error("No image returned from Gemini");

  return Buffer.from(data, "base64");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const restaurant = await prisma.restaurant.findFirst({
    where: { id, ownerId: session.user.id },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { name, description, source } = await req.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }

  const trimmedName = name.trim();
  const trimmedDescription = typeof description === "string" ? description.trim() || null : null;
  const prompt = buildPrompt(trimmedName, trimmedDescription);

  try {
    let buffer: Buffer | null = null;
    let usedSource: "stock" | "ai" = "ai";

    if (source === "stock") {
      buffer = await searchStockPhoto(trimmedName, trimmedDescription, restaurant.city ?? null);
      if (buffer) usedSource = "stock";
    }

    if (!buffer) {
      const provider = process.env.AI_IMAGE_PROVIDER?.toLowerCase();
      if (!provider || (provider !== "openai" && provider !== "gemini")) {
        return NextResponse.json(
          { error: "AI_IMAGE_PROVIDER must be set to 'openai' or 'gemini' in your environment" },
          { status: 503 }
        );
      }
      buffer = provider === "openai" ? await generateWithOpenAI(prompt) : await generateWithGemini(prompt);
      usedSource = "ai";
    }

    const url = await uploadImage(buffer, "image/png");
    return NextResponse.json({ url, source: usedSource });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate image";
    console.error("AI image generation error:", err);

    // Account-level failures (billing/quota/auth) won't resolve by retrying
    // the next item — surface them distinctly so bulk callers can stop early
    // instead of burning through every remaining item with the same error.
    const providerStatus = (err as { status?: number })?.status;
    const isAccountLevel = providerStatus === 429 || providerStatus === 401 || providerStatus === 403;

    return NextResponse.json({ error: message }, { status: isAccountLevel ? 429 : 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { detectImageContentType, uploadImage } from "@/lib/storage";
import OpenAI from "openai";
import { GoogleGenAI, Modality } from "@google/genai";
import { getStockSearchQuery, searchPexelsPhotos } from "@/lib/stock-photos";
import { buildFoodImagePrompt } from "@/lib/image-prompts";
import { withApiLogging } from "@/lib/api-handler";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

async function searchStockPhoto(
  name: string,
  description: string | null,
  city: string | null,
  interpretedDish: string | null,
): Promise<Buffer | null> {
  const query = interpretedDish ?? await getStockSearchQuery(name, description, city);
  if (!query) return null;

  const candidates = await searchPexelsPhotos(query, 8);
  if (candidates.length === 0) return null;

  const relevantPhoto = candidates[0];

  const imgRes = await fetch(relevantPhoto.url);
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

export const POST = withApiLogging(async function POST(
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
  const requestLimit = checkRateLimit(`ai:${session.user.id}`, 30, 60 * 60 * 1000);
  if (!requestLimit.allowed) {
    return NextResponse.json({ error: "AI generation limit reached. Please try again later." }, { status: 429 });
  }

  const { name, description, source } = await req.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }

  const trimmedName = name.trim();
  const trimmedDescription = typeof description === "string" ? description.trim() || null : null;

  try {
    const interpretedDish = await getStockSearchQuery(trimmedName, trimmedDescription, restaurant.city ?? null);
    let buffer: Buffer | null = null;

    if (source === "stock") {
      buffer = await searchStockPhoto(trimmedName, trimmedDescription, restaurant.city ?? null, interpretedDish);
      if (!buffer) {
        return NextResponse.json(
          { error: "No relevant stock photo found. Try a more specific description or choose AI image generation." },
          { status: 422 },
        );
      }
    } else {
      const provider = process.env.AI_IMAGE_PROVIDER?.toLowerCase();
      if (!provider || (provider !== "openai" && provider !== "gemini")) {
        return NextResponse.json(
          { error: "AI_IMAGE_PROVIDER must be set to 'openai' or 'gemini' in your environment" },
          { status: 503 }
        );
      }
      const prompt = buildFoodImagePrompt(trimmedName, trimmedDescription, interpretedDish);
      buffer = provider === "openai" ? await generateWithOpenAI(prompt) : await generateWithGemini(prompt);
    }

    const contentType = detectImageContentType(buffer);
    if (!contentType) throw new Error("AI provider returned an unsupported image format");
    const url = await uploadImage(buffer, contentType);
    return NextResponse.json({ url, source: source === "stock" ? "stock" : "ai" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate image";
    logger.error("restaurant.generate_image_failed", {
      error: err,
      restaurantId: id,
      itemName: trimmedName,
      source,
    });

    // Account-level failures (billing/quota/auth) won't resolve by retrying
    // the next item — surface them distinctly so bulk callers can stop early
    // instead of burning through every remaining item with the same error.
    const providerStatus = (err as { status?: number })?.status;
    const isAccountLevel = providerStatus === 429 || providerStatus === 401 || providerStatus === 403;

    return NextResponse.json({ error: message }, { status: isAccountLevel ? 429 : 500 });
  }
});

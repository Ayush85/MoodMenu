import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { withApiLogging } from "@/lib/api-handler";
import { logger } from "@/lib/logger";

const LandingSchema = z.object({
  tagline: z.string(),
  about: z.string(),
  highlights: z.array(z.string()).min(3).max(4),
  ctaText: z.string(),
});

type LandingCopy = z.infer<typeof LandingSchema>;

function buildPrompt(name: string, city: string, menuSample: string[]): string {
  return `Write professional, warm marketing copy for a restaurant landing page.
Restaurant name: "${name}"
City: ${city}
Sample menu items: ${menuSample.length > 0 ? menuSample.join(", ") : "not provided"}

Return ONLY valid JSON with this exact structure, no markdown, no explanation:
{
  "tagline": "a short punchy tagline, 8 words or fewer, no quotation marks",
  "about": "2-3 sentence welcoming description of the restaurant, written in third person, professional but warm tone",
  "highlights": ["3 to 4 short phrases, 3-6 words each, describing what makes this restaurant special"],
  "ctaText": "a short call-to-action for a button that leads to the menu, e.g. 'View Our Menu'"
}
Do not invent specific facts (awards, years in business, chef names) that weren't given to you. Keep the tone genuine, not generic corporate filler.`;
}

async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    generationConfig: { responseMimeType: "application/json" },
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function generateWithOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });

  return response.choices[0]?.message?.content ?? "";
}

async function generateWithClaude(prompt: string): Promise<LandingCopy | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(LandingSchema) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined to generate this copy");
  }

  return response.parsed_output ?? null;
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
    include: {
      categories: {
        take: 2,
        orderBy: { order: "asc" },
        include: { items: { take: 3, orderBy: { order: "asc" } } },
      },
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (!provider || (provider !== "gemini" && provider !== "openai" && provider !== "claude")) {
    return NextResponse.json(
      { error: "AI_PROVIDER must be set to 'gemini', 'openai', or 'claude' in your environment" },
      { status: 503 }
    );
  }

  const menuSample = restaurant.categories.flatMap((cat) => cat.items.map((item) => item.name));
  const prompt = buildPrompt(restaurant.name, restaurant.city, menuSample);

  try {
    let parsed: LandingCopy | null;

    if (provider === "claude") {
      parsed = await generateWithClaude(prompt);
    } else {
      const text = provider === "openai" ? await generateWithOpenAI(prompt) : await generateWithGemini(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const candidate = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      const result = candidate ? LandingSchema.safeParse(candidate) : null;
      parsed = result?.success ? result.data : null;
    }

    if (!parsed) {
      return NextResponse.json({ error: "Could not generate landing page copy" }, { status: 422 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate landing page copy";
    logger.error("restaurant.generate_landing_copy_failed", {
      error: err,
      restaurantId: id,
      provider,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

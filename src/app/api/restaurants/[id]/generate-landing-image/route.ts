import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadImage } from "@/lib/storage";
import OpenAI from "openai";
import { GoogleGenAI, Modality } from "@google/genai";
import { withApiLogging } from "@/lib/api-handler";
import { logger } from "@/lib/logger";

function buildPrompt(restaurantName: string, text: string, customPrompt: string | undefined, theme: { primary?: string; accent?: string; bg?: string } | null) {
  const palette = [theme?.primary, theme?.accent, theme?.bg].filter(Boolean).join(", ");
  return `Create a photorealistic editorial restaurant photograph for ${restaurantName}.
The restaurant feature is: "${text}".
${customPrompt?.trim() ? `The owner’s creative direction is: "${customPrompt.trim()}".` : ""}
Use a warm, inviting hospitality mood with natural light, rich food textures, and a refined restaurant color palette${palette ? ` inspired by ${palette}` : ""}. Make the image communicate the feature without adding text, logos, watermarks, people, or readable signage. Keep the composition suitable for a wide website feature card, with the subject clear and enough dark negative space for readable overlay text. This must look like a real professional food/lifestyle photograph, not an illustration, cartoon, 3D render, or CGI.`;
}

async function generateOpenAI(prompt: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const response = await new OpenAI({ apiKey: key }).images.generate({ model: "gpt-image-1", prompt, size: "1536x1024", quality: "high", n: 1 });
  const data = response.data?.[0]?.b64_json;
  if (!data) throw new Error("No image returned from OpenAI");
  return Buffer.from(data, "base64");
}

async function generateGemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const response = await new GoogleGenAI({ apiKey: key }).models.generateContent({ model: "gemini-2.5-flash-image", contents: prompt, config: { responseModalities: [Modality.TEXT, Modality.IMAGE] } });
  if (!response.data) throw new Error("No image returned from Gemini");
  return Buffer.from(response.data, "base64");
}

export const POST = withApiLogging(async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const restaurant = await prisma.restaurant.findFirst({ where: { id, ownerId: session.user.id }, select: { name: true, brandTheme: true } });
  if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (typeof body.text !== "string" || !body.text.trim()) return NextResponse.json({ error: "Highlight text is required" }, { status: 400 });
  if (typeof body.prompt !== "undefined" && typeof body.prompt !== "string") return NextResponse.json({ error: "Prompt must be text" }, { status: 400 });

  try {
    const provider = process.env.AI_IMAGE_PROVIDER?.toLowerCase();
    if (provider !== "openai" && provider !== "gemini") {
      return NextResponse.json({ error: "AI_IMAGE_PROVIDER must be set to 'openai' or 'gemini'" }, { status: 503 });
    }
    const prompt = buildPrompt(restaurant.name, body.text, body.prompt, restaurant.brandTheme as { primary?: string; accent?: string; bg?: string } | null);
    const buffer = provider === "gemini" ? await generateGemini(prompt) : await generateOpenAI(prompt);
    return NextResponse.json({ url: await uploadImage(buffer, "image/png") });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate highlight image";
    logger.error("restaurant.generate_landing_image_failed", {
      error,
      restaurantId: id,
      provider: process.env.AI_IMAGE_PROVIDER?.toLowerCase(),
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

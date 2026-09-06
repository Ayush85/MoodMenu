import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadImage } from "@/lib/storage";
import OpenAI from "openai";
import { GoogleGenAI, Modality } from "@google/genai";

function buildPrompt(name: string, description?: string | null) {
  return `Professional restaurant menu food photography of "${name}"${
    description ? `, described as: ${description}` : ""
  }. Appetizing, on a clean plate or bowl, natural lighting, shallow depth of field, top-down or 45-degree angle, high detail, realistic. No text, no watermark, no hands, no cutlery brand logos.`;
}

async function generateWithOpenAI(prompt: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const client = new OpenAI({ apiKey });
  const response = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024",
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

  const provider = process.env.AI_IMAGE_PROVIDER?.toLowerCase();
  if (!provider || (provider !== "openai" && provider !== "gemini")) {
    return NextResponse.json(
      { error: "AI_IMAGE_PROVIDER must be set to 'openai' or 'gemini' in your environment" },
      { status: 503 }
    );
  }

  const { name, description } = await req.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }

  const prompt = buildPrompt(name.trim(), typeof description === "string" ? description.trim() : null);

  try {
    const buffer = provider === "openai"
      ? await generateWithOpenAI(prompt)
      : await generateWithGemini(prompt);

    const url = await uploadImage(buffer, "image/png");
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate image";
    console.error("AI image generation error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

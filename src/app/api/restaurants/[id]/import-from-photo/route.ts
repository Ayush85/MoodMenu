import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const PROMPT = `You are a menu parser. Extract all menu items from this menu image.
Return ONLY valid JSON with this exact structure, no markdown, no explanation:
{
  "categories": [
    {
      "name": "Category Name",
      "items": [
        {
          "name": "Item Name",
          "description": "Brief description or null",
          "price": 123,
          "tags": ["tag1", "tag2"]
        }
      ]
    }
  ]
}
Rules:
- price must be a number (no currency symbols, digits only)
- tags can include: spicy, vegan, vegetarian, popular, hot, cold, sweet — infer from context
- description is null if not visible
- Group items by their menu section
- If no sections visible, use a single category called "Menu Items"`;

function normalizeParsedMenu(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;

  const categories = Array.isArray((raw as { categories?: unknown }).categories)
    ? (raw as { categories: unknown[] }).categories
        .map((category) => {
          if (!category || typeof category !== "object") return null;

          const name = typeof (category as { name?: unknown }).name === "string"
            ? (category as { name: string }).name.trim()
            : "Menu Items";

          const items = Array.isArray((category as { items?: unknown }).items)
            ? (category as { items: unknown[] }).items
                .map((item) => {
                  if (!item || typeof item !== "object") return null;

                  const name = typeof (item as { name?: unknown }).name === "string"
                    ? (item as { name: string }).name.trim()
                    : "Unnamed Item";

                  const description = typeof (item as { description?: unknown }).description === "string"
                    ? (item as { description: string }).description.trim() || null
                    : null;

                  const priceValue = (item as { price?: unknown }).price;
                  const price = typeof priceValue === "number"
                    ? priceValue
                    : typeof priceValue === "string"
                      ? Number.parseFloat(priceValue.replace(/[^0-9.]/g, ""))
                      : Number.NaN;

                  const tags = Array.isArray((item as { tags?: unknown }).tags)
                    ? (item as { tags: unknown[] }).tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean)
                    : [];

                  if (!name || Number.isNaN(price)) return null;

                  return { name, description, price, tags };
                })
                .filter(Boolean)
            : [];

          if (!name) return null;

          return { name, items };
        })
        .filter((category): category is { name: string; items: { name: string; description: string | null; price: number; tags: string[] }[] } => Boolean(category) && category.items.length > 0)
    : [];

  if (categories.length === 0) return null;

  return { categories };
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
  if (!id) {
    return NextResponse.json({ error: "Restaurant ID required" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 503 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large (max 10MB)" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent([
      PROMPT,
      { inlineData: { data: base64, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" } },
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse menu from image" }, { status: 422 });
    }

    const parsed = normalizeParsedMenu(JSON.parse(jsonMatch[0]));
    if (!parsed) {
      return NextResponse.json({ error: "No menu items found in the image" }, { status: 422 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Menu import error:", err);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const OFFER_TYPES = new Set(["BUY_ONE_GET_ONE", "PERCENTAGE", "FIXED_AMOUNT", "HAPPY_HOUR", "CUSTOM"]);

async function ownedRestaurant(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.user.actorType === "STAFF") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  const restaurant = await prisma.restaurant.findFirst({ where: { id, ownerId: session.user.id } });
  if (!restaurant) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  return { restaurant };
}

function parseOffer(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const type = typeof body.type === "string" ? body.type : "CUSTOM";
  if (!title) return { error: "Offer title is required" };
  if (!OFFER_TYPES.has(type)) return { error: "Invalid offer type" };

  const startsAt = body.startsAt ? new Date(String(body.startsAt)) : null;
  const endsAt = body.endsAt ? new Date(String(body.endsAt)) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) return { error: "Invalid start date" };
  if (endsAt && Number.isNaN(endsAt.getTime())) return { error: "Invalid end date" };
  if (startsAt && endsAt && startsAt > endsAt) return { error: "End date must be after start date" };

  const daysOfWeek = Array.isArray(body.daysOfWeek)
    ? body.daysOfWeek.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];
  const value = body.value === "" || body.value == null ? null : Number(body.value);
  if (value != null && (!Number.isFinite(value) || value < 0)) return { error: "Offer value must be a positive number" };

  return {
    data: {
      title,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      type: type as "BUY_ONE_GET_ONE" | "PERCENTAGE" | "FIXED_AMOUNT" | "HAPPY_HOUR" | "CUSTOM",
      value,
      currency: typeof body.currency === "string" && body.currency.trim() ? body.currency.trim().slice(0, 8) : "NPR",
      startsAt,
      endsAt,
      daysOfWeek,
      startTime: typeof body.startTime === "string" && body.startTime ? body.startTime : null,
      endTime: typeof body.endTime === "string" && body.endTime ? body.endTime : null,
      isActive: body.isActive !== false,
    },
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await ownedRestaurant(id);
  if (result.error) return result.error;
  return NextResponse.json(await prisma.offer.findMany({ where: { restaurantId: id }, orderBy: [{ isActive: "desc" }, { createdAt: "desc" }] }));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await ownedRestaurant(id);
  if (result.error) return result.error;
  const parsed = parseOffer(await req.json().catch(() => ({})));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  return NextResponse.json(await prisma.offer.create({ data: { ...parsed.data, restaurantId: id } }), { status: 201 });
}

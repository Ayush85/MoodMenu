import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withApiLogging } from "@/lib/api-handler";

async function getOffer(id: string, offerId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.user.actorType === "STAFF") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  const offer = await prisma.offer.findFirst({ where: { id: offerId, restaurantId: id, restaurant: { ownerId: session.user.id } } });
  if (!offer) return { error: NextResponse.json({ error: "Offer not found" }, { status: 404 }) };
  return { offer };
}

export const PATCH = withApiLogging(async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; offerId: string }> }) {
  const { id, offerId } = await params;
  const result = await getOffer(id, offerId);
  if (result.error) return result.error;
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  for (const key of ["title", "description", "type", "value", "currency", "startsAt", "endsAt", "daysOfWeek", "startTime", "endTime", "isActive"]) {
    if (key in body) data[key] = body[key];
  }
  if (typeof data.title === "string") data.title = data.title.trim();
  if (!data.title && "title" in data) return NextResponse.json({ error: "Offer title is required" }, { status: 400 });
  if (data.type && !["BUY_ONE_GET_ONE", "PERCENTAGE", "FIXED_AMOUNT", "HAPPY_HOUR", "CUSTOM"].includes(String(data.type))) return NextResponse.json({ error: "Invalid offer type" }, { status: 400 });
  if ("startsAt" in data) data.startsAt = data.startsAt ? new Date(String(data.startsAt)) : null;
  if ("endsAt" in data) data.endsAt = data.endsAt ? new Date(String(data.endsAt)) : null;
  if ("daysOfWeek" in data) data.daysOfWeek = Array.isArray(data.daysOfWeek) ? data.daysOfWeek.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6) : [];
  if ("value" in data) data.value = data.value === "" || data.value == null ? null : Number(data.value);
  const updated = await prisma.offer.update({ where: { id: offerId }, data: data as never });
  return NextResponse.json(updated);
});

export const DELETE = withApiLogging(async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; offerId: string }> }) {
  const { id, offerId } = await params;
  const result = await getOffer(id, offerId);
  if (result.error) return result.error;
  await prisma.offer.delete({ where: { id: offerId } });
  return NextResponse.json({ success: true });
});

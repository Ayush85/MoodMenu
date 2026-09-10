import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { geocodeLocation } from "@/lib/weather";
import { Prisma } from "@/generated/prisma/client";

const HOSTNAME_REGEX = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

function normalizeDomain(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return trimmed || null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const isStaff = session.user.actorType === "STAFF";
  const whereClause = isStaff
    ? { id, staffMembers: { some: { id: session.user.id, isActive: true } } }
    : { id, ownerId: session.user.id };

  const restaurant = await prisma.restaurant.findFirst({
    where: whereClause,
    include: {
      tables: { orderBy: { number: "asc" } },
      categories: {
        orderBy: { order: "asc" },
        include: { items: { orderBy: { order: "asc" } } },
      },
      moodRules: { orderBy: { priority: "desc" } },
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(restaurant);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.actorType === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const data = await req.json();

  const restaurant = await prisma.restaurant.findFirst({
    where: { id, ownerId: session.user.id },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const customDomain = normalizeDomain(data.customDomain);
  if (customDomain && !HOSTNAME_REGEX.test(customDomain)) {
    return NextResponse.json(
      { error: "That doesn't look like a valid domain (e.g. yourrestaurant.com) — no paths, ports, or query strings" },
      { status: 400 }
    );
  }

  // A changed or cleared domain needs to be re-verified and re-provisioned —
  // the automated nginx/TLS script only sets this once it has issued a
  // certificate for the domain currently on file.
  const domainChanged = customDomain !== undefined && customDomain !== restaurant.customDomain;

  let updated;
  try {
    updated = await prisma.restaurant.update({
      where: { id },
      data: {
        name: data.name,
        city: data.city,
        logo: data.logo,
        latitude: data.latitude,
        longitude: data.longitude,
        brandTheme: data.brandTheme,
        cardStyle: data.cardStyle,
        layoutTemplate: data.layoutTemplate,
        customDomain,
        domainVerifiedAt: domainChanged ? null : undefined,
        landingEnabled: typeof data.landingEnabled === "boolean" ? data.landingEnabled : undefined,
        landingPage: data.landingPage,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "That domain is already in use by another restaurant" }, { status: 409 });
    }
    throw err;
  }

  if ((data.latitude === undefined || data.longitude === undefined) && data.city) {
    const coordinates = await geocodeLocation(data.city);
    if (coordinates) {
      const withCoordinates = await prisma.restaurant.update({
        where: { id },
        data: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        },
      });
      return NextResponse.json(withCoordinates);
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.actorType === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const restaurant = await prisma.restaurant.findFirst({
    where: { id, ownerId: session.user.id },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.restaurant.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

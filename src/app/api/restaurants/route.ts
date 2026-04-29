import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { geocodeLocation } from "@/lib/weather";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.actorType === "STAFF") {
    const allowedIds = session.user.restaurantIds?.length
      ? session.user.restaurantIds
      : (session.user.restaurantId ? [session.user.restaurantId] : []);

    if (allowedIds.length === 0) {
      return NextResponse.json([]);
    }

    const staffRestaurant = await prisma.restaurant.findMany({
      where: { id: { in: allowedIds } },
      include: { categories: { include: { items: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(staffRestaurant);
  }

  const restaurants = await prisma.restaurant.findMany({
    where: { ownerId: session.user.id },
    include: { categories: { include: { items: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(restaurants);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.actorType === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, city, slug } = await req.json();

  if (!name || !city || !slug) {
    return NextResponse.json(
      { error: "Name, city, and slug are required" },
      { status: 400 }
    );
  }

  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(slug)) {
    return NextResponse.json(
      { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
      { status: 400 }
    );
  }

  const existing = await prisma.restaurant.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: "This slug is already taken" },
      { status: 409 }
    );
  }

  const restaurant = await prisma.restaurant.create({
    data: {
      name,
      city,
      slug,
      ownerId: session.user.id,
    },
  });

  const coordinates = await geocodeLocation(city);
  if (coordinates) {
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      },
    });
  }

  return NextResponse.json(
    coordinates
      ? { ...restaurant, latitude: coordinates.latitude, longitude: coordinates.longitude }
      : restaurant,
    { status: 201 }
  );
}

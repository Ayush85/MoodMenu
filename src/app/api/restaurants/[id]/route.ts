import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { geocodeLocation } from "@/lib/weather";

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

  const updated = await prisma.restaurant.update({
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
    },
  });

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

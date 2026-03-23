import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || null;

  await prisma.menuScan.create({
    data: {
      restaurantId: restaurant.id,
      tableNumber: body.tableNumber ? parseInt(body.tableNumber) : null,
      userAgent: req.headers.get("user-agent")?.slice(0, 200) || null,
      ip: ip?.slice(0, 45) || null,
    },
  });

  return NextResponse.json({ ok: true });
}

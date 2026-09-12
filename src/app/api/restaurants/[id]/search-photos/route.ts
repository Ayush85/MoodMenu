import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStockSearchQuery, searchPexelsPhotos } from "@/lib/stock-photos";
import { withApiLogging } from "@/lib/api-handler";

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
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  let query = typeof body.query === "string" ? body.query.trim() : "";
  let suggestedQuery: string | undefined;

  if (!query) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "A name or query is required" }, { status: 400 });
    }
    const description = typeof body.description === "string" ? body.description.trim() || null : null;

    const suggested = await getStockSearchQuery(name, description, restaurant.city);
    query = suggested || name;
    suggestedQuery = query;
  }

  const results = await searchPexelsPhotos(query, 8);
  return NextResponse.json({ suggestedQuery: suggestedQuery ?? query, results });
});

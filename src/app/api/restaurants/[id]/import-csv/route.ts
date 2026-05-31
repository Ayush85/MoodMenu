import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface CsvRow {
  category: string;
  name: string;
  description?: string;
  price: number;
  tags?: string[];
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
    include: { categories: { select: { id: true, name: true } } },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const rows: CsvRow[] = body.rows;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  if (rows.length > 500) {
    return NextResponse.json({ error: "Maximum 500 items per import" }, { status: 400 });
  }

  // Validate rows
  for (const row of rows) {
    if (!row.category?.trim()) return NextResponse.json({ error: `Missing category for item: ${row.name}` }, { status: 400 });
    if (!row.name?.trim()) return NextResponse.json({ error: "All items must have a name" }, { status: 400 });
    if (typeof row.price !== "number" || isNaN(row.price) || row.price < 0) {
      return NextResponse.json({ error: `Invalid price for item: ${row.name}` }, { status: 400 });
    }
  }

  // Group rows by category
  const grouped: Record<string, CsvRow[]> = {};
  for (const row of rows) {
    const key = row.category.trim();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }

  // Resolve / create categories
  const categoryMap: Record<string, string> = {}; // name → id
  for (const existing of restaurant.categories) {
    categoryMap[existing.name.toLowerCase()] = existing.id;
  }

  let created = 0;
  let categoriesCreated = 0;

  const maxOrderResult = await prisma.category.aggregate({
    where: { restaurantId: id },
    _max: { order: true },
  });
  let nextOrder = (maxOrderResult._max.order ?? -1) + 1;

  for (const [catName, catRows] of Object.entries(grouped)) {
    const key = catName.toLowerCase();
    let categoryId = categoryMap[key];

    if (!categoryId) {
      const newCat = await prisma.category.create({
        data: {
          name: catName,
          order: nextOrder++,
          restaurantId: id,
        },
      });
      categoryId = newCat.id;
      categoryMap[key] = categoryId;
      categoriesCreated++;
    }

    // Batch create items
    await prisma.menuItem.createMany({
      data: catRows.map((row) => ({
        name: row.name.trim(),
        description: row.description?.trim() || null,
        price: row.price,
        tags: Array.isArray(row.tags) ? row.tags.filter(Boolean) : [],
        categoryId,
      })),
    });
    created += catRows.length;
  }

  return NextResponse.json({
    ok: true,
    itemsCreated: created,
    categoriesCreated,
  });
}

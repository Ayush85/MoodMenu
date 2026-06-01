import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const VALID_CATEGORIES = ["INGREDIENTS","UTILITIES","STAFF","RENT","MAINTENANCE","MARKETING","EQUIPMENT","OTHER"] as const;

async function ownerOnly(restaurantId: string, userId: string) {
  return prisma.restaurant.findFirst({ where: { id: restaurantId, ownerId: userId }, select: { id: true } });
}

// GET /api/restaurants/[id]/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!await ownerOnly(id, session.user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const where: { restaurantId: string; date?: { gte?: Date; lte?: Date } } = { restaurantId: id };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.date.lte = toDate;
    }
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
    take: 200,
  });

  return NextResponse.json(expenses);
}

// POST /api/restaurants/[id]/expenses
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!await ownerOnly(id, session.user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const title = String(body.title || "").trim().slice(0, 100);
  const amount = parseFloat(body.amount);
  const category = VALID_CATEGORIES.includes(body.category) ? body.category : "OTHER";
  const note = body.note ? String(body.note).trim().slice(0, 300) : null;
  const date = body.date ? new Date(body.date) : new Date();

  if (!title || isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Title and a positive amount are required" }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: { restaurantId: id, title, amount, category, note, date },
  });

  return NextResponse.json(expense, { status: 201 });
}

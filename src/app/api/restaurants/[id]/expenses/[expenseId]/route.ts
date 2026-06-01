import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function ownerOnly(restaurantId: string, userId: string) {
  return prisma.restaurant.findFirst({ where: { id: restaurantId, ownerId: userId }, select: { id: true } });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, expenseId } = await params;
  if (!await ownerOnly(id, session.user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.expense.deleteMany({ where: { id: expenseId, restaurantId: id } });
  return NextResponse.json({ success: true });
}

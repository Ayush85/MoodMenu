import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function canAccess(restaurantId: string, userId: string, actorType?: string) {
  if (actorType === "STAFF") {
    return prisma.restaurantStaff.findFirst({
      where: { id: userId, restaurantId, isActive: true },
    });
  }
  return prisma.restaurant.findFirst({ where: { id: restaurantId, ownerId: userId } });
}

// PATCH /api/restaurants/[id]/sessions/[sessionId]
// Body: { action: "close" }  — closes the session and marks all orders PAID
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, sessionId } = await params;
  if (!await canAccess(id, session.user.id, session.user.actorType)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { action } = await req.json();

  if (action === "close") {
    const tableSession = await prisma.tableSession.findFirst({
      where: { id: sessionId, restaurantId: id },
    });
    if (!tableSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    // Close session and mark all non-canceled orders as PAID
    await prisma.$transaction([
      prisma.orderTicket.updateMany({
        where: { sessionId, status: { notIn: ["CANCELED", "PAID"] } },
        data: { status: "PAID" },
      }),
      prisma.tableSession.update({
        where: { id: sessionId },
        data: { status: "CLOSED", endedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withApiLogging } from "@/lib/api-handler";

async function canAccess(restaurantId: string, userId: string, actorType?: string) {
  if (actorType === "STAFF") {
    return prisma.restaurantStaff.findFirst({
      where: { id: userId, restaurantId, isActive: true },
    });
  }
  return prisma.restaurant.findFirst({ where: { id: restaurantId, ownerId: userId } });
}

export const GET = withApiLogging(async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!await canAccess(id, session.user.id, session.user.actorType)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const status = req.nextUrl.searchParams.get("status") || "ACTIVE";

  const sessions = await prisma.tableSession.findMany({
    where: { restaurantId: id, status: status as "ACTIVE" | "CLOSED" },
    include: {
      table: { select: { number: true, label: true } },
      orders: {
        orderBy: { createdAt: "asc" },
        include: { items: true },
      },
    },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(sessions);
});

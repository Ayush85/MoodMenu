import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withApiLogging } from "@/lib/api-handler";
import { getRestaurantAccess } from "@/lib/restaurant-access";

export const GET = withApiLogging(async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!await getRestaurantAccess(id, {
    id: session.user.id,
    actorType: session.user.actorType,
  })) {
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

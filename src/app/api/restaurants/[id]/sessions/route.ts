import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withApiLogging } from "@/lib/api-handler";
import { createPrismaTableService } from "@/modules/table-service/infrastructure/prisma/create-table-service";
import { resolveOrderActor } from "@/modules/ordering/infrastructure/http/order-actor";

const tableService = createPrismaTableService();

export const GET = withApiLogging(async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const actor = await resolveOrderActor(id, {
    id: session.user.id,
    actorType: session.user.actorType,
  });
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const requestedStatus = req.nextUrl.searchParams.get("status");
  const status = requestedStatus === "CLOSED" ? "CLOSED" : "ACTIVE";
  const sessions = await tableService.listSessions(id, status);
  return NextResponse.json(sessions);
});

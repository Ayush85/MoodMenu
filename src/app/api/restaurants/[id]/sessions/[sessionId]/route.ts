import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withApiLogging } from "@/lib/api-handler";
import { domainErrorToHttp } from "@/modules/shared/application/domain-error-http";
import { createPrismaTableService } from "@/modules/table-service/infrastructure/prisma/create-table-service";
import { resolveOrderActor } from "@/modules/ordering/infrastructure/http/order-actor";

const tableService = createPrismaTableService();

export const PATCH = withApiLogging(async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, sessionId } = await params;
  const actor = await resolveOrderActor(id, {
    id: session.user.id,
    actorType: session.user.actorType,
  });
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    if (body?.action !== "close") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    await tableService.closeSession(id, sessionId, new Date());
    return NextResponse.json({ success: true });
  } catch (error) {
    const mapped = domainErrorToHttp(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
});

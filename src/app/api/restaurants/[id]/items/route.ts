import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withApiLogging } from "@/lib/api-handler";
import { domainErrorToHttp } from "@/modules/shared/application/domain-error-http";
import { createPrismaMenuService } from "@/modules/menu-management/infrastructure/prisma/create-menu-service";
import { resolveMenuActor } from "@/modules/menu-management/infrastructure/http/menu-actor";

const menuService = createPrismaMenuService();

function errorResponse(error: unknown) {
  const mapped = domainErrorToHttp(error);
  return NextResponse.json({ error: mapped.message }, { status: mapped.status });
}

export const POST = withApiLogging(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const actor = await resolveMenuActor(id, {
    id: session.user.id,
    actorType: session.user.actorType,
  });
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    if (!body?.name || body?.price === undefined || !body?.categoryId) {
      return NextResponse.json(
        { error: "Name, price, and categoryId are required" },
        { status: 400 },
      );
    }
    const item = await menuService.createItem(actor, id, body);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
});
export const PATCH = withApiLogging(async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const actor = await resolveMenuActor(id, {
    id: session.user.id,
    actorType: session.user.actorType,
  });
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    if (Array.isArray(body?.order)) {
      await menuService.reorderItems(actor, id, body.order);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
});

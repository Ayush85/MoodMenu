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

export const PATCH = withApiLogging(async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, itemId } = await params;
  const actor = await resolveMenuActor(id, {
    id: session.user.id,
    actorType: session.user.actorType,
  });
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const data = await req.json();
    const updated = await menuService.updateItem(actor, id, itemId, {
      name: data.name,
      description: data.description,
      price: data.price !== undefined ? Number.parseFloat(data.price) : undefined,
      image: data.image,
      tags: data.tags,
      isAvailable: data.isAvailable,
      isSpecial: data.isSpecial,
      categoryId: data.categoryId,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
});
export const DELETE = withApiLogging(async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, itemId } = await params;
  const actor = await resolveMenuActor(id, {
    id: session.user.id,
    actorType: session.user.actorType,
  });
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await menuService.deleteItem(actor, id, itemId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
});

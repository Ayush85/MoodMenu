import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withApiLogging } from "@/lib/api-handler";
import { createPrismaMenuService } from "@/modules/menu-management/infrastructure/prisma/create-menu-service";
import { resolveMenuActor } from "@/modules/menu-management/infrastructure/http/menu-actor";
import { domainErrorToHttp } from "@/modules/shared/application/domain-error-http";
import type { MenuImportInput } from "@/modules/menu-management/ports/menu-repository";

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

  const body = await req.json();
  if (!Array.isArray(body?.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }
  if (body.rows.length > 500) {
    return NextResponse.json({ error: "Maximum 500 items per import" }, { status: 400 });
  }

  const grouped = new Map<string, MenuImportInput["categories"][number]>();
  for (const rawRow of body.rows) {
    const row = rawRow && typeof rawRow === "object"
      ? rawRow as Record<string, unknown>
      : {};
    const category = typeof row.category === "string" ? row.category.trim() : "";
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const key = category.toLowerCase();
    const existing = grouped.get(key);
    const target = existing ?? { name: category, items: [] };
    target.items.push({
      name,
      description: typeof row.description === "string" ? row.description : null,
      price: row.price as number,
      tags: Array.isArray(row.tags)
        ? row.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
    });
    grouped.set(key, target);
  }

  try {
    const result = await menuService.importMenu(actor, id, {
      categories: Array.from(grouped.values()),
    });
    return NextResponse.json({
      ok: true,
      itemsCreated: result.itemsCreated,
      categoriesCreated: result.categoriesCreated,
      items: result.items,
    });
  } catch (error) {
    return errorResponse(error);
  }
});

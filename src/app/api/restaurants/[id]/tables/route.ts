import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withApiLogging } from "@/lib/api-handler";
import { signTableToken } from "@/lib/table-token";

async function verifyAccess(restaurantId: string, userId: string, actorType?: string) {
  if (actorType === "STAFF") {
    const staff = await prisma.restaurantStaff.findFirst({
      where: { id: userId, restaurantId, isActive: true },
    });
    return !!staff;
  }
  const restaurant = await prisma.restaurant.findFirst({
    where: { id: restaurantId, ownerId: userId },
  });
  return !!restaurant;
}

export const GET = withApiLogging(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await verifyAccess(id, session.user.id, session.user.actorType))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId: id },
    orderBy: { number: "asc" },
  });

  // Each table's QR code embeds this token so the public menu can prove the
  // table number wasn't hand-edited in the URL — see src/lib/table-token.ts.
  const withTokens = tables.map((table) => ({
    ...table,
    qrToken: signTableToken(id, table.number, table.qrVersion),
  }));

  return NextResponse.json(withTokens);
});

export const POST = withApiLogging(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.actorType === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const restaurant = await prisma.restaurant.findFirst({
    where: { id, ownerId: session.user.id },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { count } = await req.json();
  const tableCount = Math.min(Math.max(parseInt(count) || 1, 1), 100);

  // Read-then-create needs to be atomic: two concurrent "add tables"
  // requests reading the same starting number outside a transaction could
  // otherwise leave a partial batch created before the unique constraint on
  // (restaurantId, number) rejects the rest. Wrapping it means the whole
  // batch commits together or not at all.
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.restaurantTable.findMany({
        where: { restaurantId: id },
        orderBy: { number: "desc" },
        take: 1,
      });

      const startNumber = existing.length > 0 ? existing[0].number + 1 : 1;

      for (let i = 0; i < tableCount; i++) {
        const num = startNumber + i;
        await tx.restaurantTable.create({
          data: {
            number: num,
            label: `Table ${num}`,
            restaurantId: id,
          },
        });
      }
    });
  } catch {
    return NextResponse.json({ error: "Could not create tables. Please try again." }, { status: 409 });
  }

  return NextResponse.json({ created: tableCount }, { status: 201 });
});

// PATCH { tableId, action: "regenerateQr" } — invalidates that table's
// currently-printed QR code by bumping its version, without affecting any
// other table. The owner must reprint/re-place the QR after this.
export const PATCH = withApiLogging(async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.actorType === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const restaurant = await prisma.restaurant.findFirst({
    where: { id, ownerId: session.user.id },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { tableId, action } = await req.json();
  if (action !== "regenerateQr" || typeof tableId !== "string") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const table = await prisma.restaurantTable.update({
    where: { id: tableId, restaurantId: id },
    data: { qrVersion: { increment: 1 } },
  });

  return NextResponse.json({ ...table, qrToken: signTableToken(id, table.number, table.qrVersion) });
});

export const DELETE = withApiLogging(async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.actorType === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const restaurant = await prisma.restaurant.findFirst({
    where: { id, ownerId: session.user.id },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { tableId } = await req.json();
  await prisma.restaurantTable.delete({ where: { id: tableId, restaurantId: id } });

  return NextResponse.json({ success: true });
});

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OrderStatus } from "@/generated/prisma/client";
import { withApiLogging } from "@/lib/api-handler";
import { sendPush } from "@/lib/push";

const validStatuses = ["NEW", "PREPARING", "SERVED", "PAID", "CANCELED"] as const;

type AccessInfo =
  | { kind: "OWNER" }
  | { kind: "STAFF"; role: "WAITER" | "COOK" | "CHEF" };

async function getRestaurantAccess(restaurantId: string, sessionUser: { id: string; actorType?: "USER" | "STAFF" }): Promise<AccessInfo | null> {
  if (sessionUser.actorType === "STAFF") {
    const staffRecord = await prisma.restaurantStaff.findFirst({
      where: { id: sessionUser.id, restaurantId, isActive: true },
      select: { id: true, role: true },
    });
    if (!staffRecord) return null;
    return { kind: "STAFF", role: staffRecord.role as "WAITER" | "COOK" | "CHEF" };
  }

  const ownerRecord = await prisma.restaurant.findFirst({
    where: { id: restaurantId, ownerId: sessionUser.id },
    select: { id: true },
  });
  if (!ownerRecord) return null;
  return { kind: "OWNER" };
}

export const PATCH = withApiLogging(async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, orderId } = await params;
  const body = await req.json();
  const status = body?.status as (typeof validStatuses)[number] | undefined;

  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const access = await getRestaurantAccess(id, {
    id: session.user.id,
    actorType: session.user.actorType,
  });

  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (access.kind === "STAFF") {
    const waiterAllowed = new Set(["SERVED", "PAID", "CANCELED"]);
    const kitchenAllowed = new Set(["PREPARING", "SERVED", "CANCELED"]);

    if (access.role === "WAITER" && !waiterAllowed.has(status)) {
      return NextResponse.json({ error: "Waiter cannot set this status" }, { status: 403 });
    }

    if ((access.role === "COOK" || access.role === "CHEF") && !kitchenAllowed.has(status)) {
      return NextResponse.json({ error: "Kitchen staff cannot set this status" }, { status: 403 });
    }
  }

  const order = await prisma.orderTicket.findFirst({
    where: { id: orderId, restaurantId: id },
    select: { id: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const updated = await prisma.orderTicket.update({
    where: { id: orderId },
    data: { status: status as OrderStatus },
    include: { table: true, items: true },
  });

  // Auto-close the session when all its orders are terminal (PAID or CANCELED)
  if ((status === "PAID" || status === "CANCELED") && updated.sessionId) {
    const sibling = await prisma.orderTicket.findFirst({
      where: {
        sessionId: updated.sessionId,
        status: { notIn: ["PAID", "CANCELED"] },
      },
      select: { id: true },
    });

    if (!sibling) {
      await prisma.tableSession.update({
        where: { id: updated.sessionId },
        data: { status: "CLOSED", endedAt: new Date() },
      });
    }
  }

  // Kitchen marking an order SERVED is the signal a waiter needs to go
  // pick it up — that's the one status change worth interrupting someone
  // for. (NEW/PREPARING are visible on the order board already; PAID/
  // CANCELED are low-urgency wrap-up steps.)
  if (status === "SERVED") {
    const recipients = await prisma.restaurant.findFirst({
      where: { id },
      select: {
        ownerId: true,
        staffMembers: { where: { isActive: true, role: "WAITER" }, select: { id: true } },
      },
    });

    if (recipients) {
      const recipientIds = [recipients.ownerId, ...recipients.staffMembers.map((s) => s.id)]
        .filter((rid) => rid !== session.user!.id);

      if (recipientIds.length > 0) {
        const tableLabel = updated.table.label || `Table ${updated.table.number}`;
        sendPush({
          title: `✅ Order ready — ${tableLabel}`,
          body: `${updated.items.length} item${updated.items.length !== 1 ? "s" : ""} ready to serve`,
          userIds: recipientIds,
          url: `/dashboard/restaurant/${id}/staff`,
          data: {
            type: "order_status",
            orderId: updated.id,
            status: "SERVED",
            tableNumber: String(updated.table.number),
            restaurantId: id,
          },
        });
      }
    }
  }

  return NextResponse.json(updated);
});

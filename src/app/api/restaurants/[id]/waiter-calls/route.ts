import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { CallStatus } from "@/generated/prisma/client";

const VALID_TRANSITIONS: Record<CallStatus, CallStatus[]> = {
  PENDING: ["ACKNOWLEDGED", "RESOLVED"],
  ACKNOWLEDGED: ["RESOLVED"],
  RESOLVED: [],
};

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const access = await getRestaurantAccess(id, {
    id: session.user.id,
    actorType: session.user.actorType,
  });

  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (access.kind === "STAFF" && access.role !== "WAITER") {
    return NextResponse.json({ error: "Only waiters can access waiter calls" }, { status: 403 });
  }

  const calls = await prisma.waiterCall.findMany({
    where: { restaurantId: id },
    include: { table: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(calls);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const access = await getRestaurantAccess(id, {
    id: session.user.id,
    actorType: session.user.actorType,
  });

  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (access.kind === "STAFF" && access.role !== "WAITER") {
    return NextResponse.json({ error: "Only waiters can update waiter calls" }, { status: 403 });
  }
  const { callId, status } = await req.json();

  if (!VALID_TRANSITIONS[status as CallStatus]) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.waiterCall.findFirst({
    where: { id: callId, restaurantId: id },
    select: { status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!VALID_TRANSITIONS[existing.status].includes(status)) {
    return NextResponse.json(
      { error: `Cannot move a call from ${existing.status} to ${status}` },
      { status: 409 }
    );
  }

  const call = await prisma.waiterCall.update({
    where: { id: callId, restaurantId: id },
    data: {
      status,
      handledBy: session.user.id,
      acknowledgedAt: status === "ACKNOWLEDGED" ? new Date() : undefined,
      resolvedAt: status === "RESOLVED" ? new Date() : undefined,
    },
    include: { table: true },
  });

  return NextResponse.json(call);
}

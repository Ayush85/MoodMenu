import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withApiLogging } from "@/lib/api-handler";
import { actorCan } from "@/modules/shared/application/actor";
import { domainErrorToHttp } from "@/modules/shared/application/domain-error-http";
import { PrismaWaiterCallRepository } from "@/modules/table-service/infrastructure/prisma/PrismaWaiterCallRepository";
import { resolveOrderActor } from "@/modules/ordering/infrastructure/http/order-actor";
import type { WaiterCallStatus } from "@/modules/table-service/domain/waiter-call";

const waiterCalls = new PrismaWaiterCallRepository();
const clock = { now: () => new Date() };
const validStatuses: WaiterCallStatus[] = ["PENDING", "ACKNOWLEDGED", "RESOLVED"];

function errorResponse(error: unknown) {
  const mapped = domainErrorToHttp(error);
  return NextResponse.json({ error: mapped.message }, { status: mapped.status });
}

export const GET = withApiLogging(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const actor = await resolveOrderActor(id, {
    id: session.user.id,
    actorType: session.user.actorType,
  });
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!actorCan(actor, "manage_waiter_calls")) {
    return NextResponse.json({ error: "Only waiters can access waiter calls" }, { status: 403 });
  }

  const calls = await waiterCalls.listByRestaurant(id);
  return NextResponse.json(calls);
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
  const actor = await resolveOrderActor(id, {
    id: session.user.id,
    actorType: session.user.actorType,
  });
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!actorCan(actor, "manage_waiter_calls")) {
    return NextResponse.json({ error: "Only waiters can update waiter calls" }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (typeof body?.callId !== "string" || !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const existing = await waiterCalls.findById(id, body.callId);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updated = existing.advanceTo(body.status, clock, session.user.id);
    return NextResponse.json(await waiterCalls.save(updated));
  } catch (error) {
    return errorResponse(error);
  }
});

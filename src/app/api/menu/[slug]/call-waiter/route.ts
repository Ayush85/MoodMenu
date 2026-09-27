import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api-handler";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { PushNotificationPort } from "@/modules/shared/infrastructure/PushNotificationPort";
import { DomainError } from "@/modules/shared/domain/errors";
import { domainErrorToHttp } from "@/modules/shared/application/domain-error-http";
import { WaiterCall } from "@/modules/table-service/domain/waiter-call";
import { PrismaWaiterCallRepository } from "@/modules/table-service/infrastructure/prisma/PrismaWaiterCallRepository";
import { createCustomerTableActorService } from "@/modules/table-service/infrastructure/http/create-customer-table-actor-service";
import { PrismaAuditLog } from "@/modules/shared/infrastructure/prisma/PrismaAuditLog";

const customerTableActorService = createCustomerTableActorService();
const waiterCalls = new PrismaWaiterCallRepository(new PrismaAuditLog());
const notifications = new PushNotificationPort();

export const POST = withApiLogging(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));

  const requestLimit = checkRateLimit(`call-waiter:${getClientIp(req)}`, 20, 10 * 60 * 1000);
  if (!requestLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(requestLimit.retryAfterSeconds) } },
    );
  }

  try {
    const actor = await customerTableActorService.resolve({
      slug,
      tableNumber: body?.tableNumber,
      tableToken: body?.tableToken,
    });
    if (actor.allowedIp && getClientIp(req) !== actor.allowedIp) {
      return NextResponse.json(
        { error: "Please connect to the restaurant WiFi to call a waiter." },
        { status: 403 },
      );
    }

    const message = body?.message
      ? String(body.message).trim().slice(0, 200)
      : null;
    if (message === "__wifi_check__") {
      return NextResponse.json({ ok: true, verified: true });
    }

    const since = new Date(Date.now() - 2 * 60 * 1000);
    if (await waiterCalls.hasRecentPending(actor.tableId, since)) {
      return NextResponse.json(
        { error: "A waiter has already been called. Please wait." },
        { status: 429 },
      );
    }

    const call = await waiterCalls.create(WaiterCall.create({
      id: randomUUID(),
      restaurantId: actor.restaurantId,
      tableId: actor.tableId,
      message,
      createdAt: new Date(),
    }));

    void notifications.sendToRestaurant({
      restaurantId: actor.restaurantId,
      staffRoles: ["WAITER"],
      title: `🔔 ${actor.tableLabel || `Table ${actor.tableNumber}`} is calling!`,
      body: message || "A customer needs assistance.",
      url: `/dashboard/restaurant/${actor.restaurantId}/orders`,
      data: {
        type: "waiter_call",
        callId: call.id,
        tableNumber: String(actor.tableNumber),
        restaurantId: actor.restaurantId,
      },
    });

    return NextResponse.json({
      id: call.id,
      tableNumber: actor.tableNumber,
      tableLabel: actor.tableLabel,
      status: call.status,
      createdAt: call.createdAt,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof DomainError && error.code === "VALIDATION_FAILED") {
      return NextResponse.json(
        { error: "This link doesn't match a table at this restaurant. Please scan the QR code at your table." },
        { status: 400 },
      );
    }
    const mapped = domainErrorToHttp(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
});

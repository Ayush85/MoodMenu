import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

async function sendPushToOwner(ownerId: string, tableLabel: string, tableNumber: number, message: string | null) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) return;

  try {
    await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        include_external_user_ids: [ownerId],
        headings: { en: `Table ${tableNumber} (${tableLabel})` },
        contents: { en: message || "A customer is calling for a waiter!" },
        url: "/dashboard",
      }),
    });
  } catch {
    // Push failed silently — waiter call is still saved in DB
  }
}

function getClientIp(req: NextRequest): string {
  // Check forwarded headers (behind nginx/proxy)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();

  const tableNumber = parseInt(String(body.tableNumber));
  if (!tableNumber || tableNumber < 1 || tableNumber > 9999) {
    return NextResponse.json({ error: "Invalid table number" }, { status: 400 });
  }

  const message = body.message
    ? String(body.message).trim().slice(0, 200)
    : null;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      tables: { where: { number: tableNumber } },
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  // Verify customer is on restaurant WiFi (IP check)
  if (restaurant.allowedIp) {
    const clientIp = getClientIp(req);
    if (clientIp !== restaurant.allowedIp) {
      return NextResponse.json(
        { error: "Please connect to the restaurant WiFi to call a waiter." },
        { status: 403 }
      );
    }
  }

  // WiFi check only — don't create a call
  if (message === "__wifi_check__") {
    return NextResponse.json({ ok: true, verified: true });
  }

  if (restaurant.tables.length === 0) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  const table = restaurant.tables[0];

  // Prevent spam: max 1 pending call per table per 2 minutes
  const recentCall = await prisma.waiterCall.findFirst({
    where: {
      tableId: table.id,
      status: "PENDING",
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
    },
  });

  if (recentCall) {
    return NextResponse.json(
      { error: "A waiter has already been called. Please wait." },
      { status: 429 }
    );
  }

  const call = await prisma.waiterCall.create({
    data: {
      message,
      tableId: table.id,
      restaurantId: restaurant.id,
    },
    include: { table: true },
  });

  // Send push notification to restaurant owner/staff
  sendPushToOwner(restaurant.ownerId, call.table.label || "Table", call.table.number, message);

  return NextResponse.json({
    id: call.id,
    tableNumber: call.table.number,
    tableLabel: call.table.label,
    status: call.status,
    createdAt: call.createdAt,
  }, { status: 201 });
}

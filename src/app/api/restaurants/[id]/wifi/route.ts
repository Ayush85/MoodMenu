import { NextRequest, NextResponse } from "next/server";
import { isIP } from "node:net";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withApiLogging } from "@/lib/api-handler";

export const PATCH = withApiLogging(async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { wifiSsid, wifiPassword, allowedIp } = await req.json();

  const restaurant = await prisma.restaurant.findFirst({
    where: { id, ownerId: session.user.id },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (wifiSsid !== undefined) {
    if (wifiSsid !== null && (typeof wifiSsid !== "string" || wifiSsid.length > 128)) {
      return NextResponse.json({ error: "WiFi network name is invalid" }, { status: 400 });
    }
    data.wifiSsid = typeof wifiSsid === "string" ? wifiSsid.trim() || null : null;
  }
  if (wifiPassword !== undefined) {
    if (wifiPassword !== null && (typeof wifiPassword !== "string" || wifiPassword.length > 256)) {
      return NextResponse.json({ error: "WiFi password is invalid" }, { status: 400 });
    }
    data.wifiPassword = typeof wifiPassword === "string" ? wifiPassword.slice(0, 256) || null : null;
  }
  if (allowedIp !== undefined) {
    if (allowedIp !== null && typeof allowedIp !== "string") {
      return NextResponse.json({ error: "Allowed IP must be an IPv4 or IPv6 address" }, { status: 400 });
    }
    const normalizedIp = typeof allowedIp === "string" ? allowedIp.trim() : "";
    if (normalizedIp && isIP(normalizedIp) === 0) {
      return NextResponse.json({ error: "Allowed IP must be an IPv4 or IPv6 address" }, { status: 400 });
    }
    data.allowedIp = normalizedIp || null;
  }

  const updated = await prisma.restaurant.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    wifiSsid: updated.wifiSsid,
    wifiPassword: updated.wifiPassword,
    allowedIp: updated.allowedIp,
  });
});

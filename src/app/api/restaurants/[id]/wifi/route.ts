import { NextRequest, NextResponse } from "next/server";
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
  if (wifiSsid !== undefined) data.wifiSsid = wifiSsid;
  if (wifiPassword !== undefined) data.wifiPassword = wifiPassword;
  if (allowedIp !== undefined) data.allowedIp = allowedIp || null;

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

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withApiLogging } from "@/lib/api-handler";
import { checkRateLimit } from "@/lib/rate-limit";

export const POST = withApiLogging(async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestLimit = checkRateLimit(`push-register:${session.user.id}`, 20, 10 * 60 * 1000);
  if (!requestLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(requestLimit.retryAfterSeconds) } },
    );
  }

  const body = await req.json();
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  await prisma.pushToken.upsert({
    where: { token },
    create: { token, ownerId: session.user.id },
    update: { ownerId: session.user.id },
  });

  return NextResponse.json({ ok: true });
});

export const DELETE = withApiLogging(async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  await prisma.pushToken.deleteMany({ where: { token, ownerId: session.user.id } });

  return NextResponse.json({ ok: true });
});

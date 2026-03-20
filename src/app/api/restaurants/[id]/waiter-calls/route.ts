import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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
  const { callId, status } = await req.json();

  const call = await prisma.waiterCall.update({
    where: { id: callId, restaurantId: id },
    data: {
      status,
      resolvedAt: status === "RESOLVED" ? new Date() : undefined,
    },
    include: { table: true },
  });

  return NextResponse.json(call);
}

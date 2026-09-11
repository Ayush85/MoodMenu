import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { requestDomainProvisioning } from "@/lib/domain-provision";

export async function POST(
  _req: NextRequest,
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
    select: { customDomain: true, domainVerifiedAt: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!restaurant.customDomain) {
    return NextResponse.json({ error: "Save a custom domain before verifying it" }, { status: 400 });
  }

  const triggered = await requestDomainProvisioning();
  if (!triggered) {
    return NextResponse.json(
      { error: "The domain provisioner is unavailable. Please contact the server administrator." },
      { status: 503 }
    );
  }

  const refreshed = await prisma.restaurant.findUnique({
    where: { id },
    select: { customDomain: true, domainVerifiedAt: true },
  });

  return NextResponse.json({
    verified: Boolean(refreshed?.domainVerifiedAt),
    customDomain: refreshed?.customDomain,
    domainVerifiedAt: refreshed?.domainVerifiedAt,
    message: refreshed?.domainVerifiedAt
      ? "Domain verified and HTTPS is active"
      : "Provisioning ran, but DNS or HTTPS is not ready yet",
  });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withApiLogging } from "@/lib/api-handler";

// Lets the "create restaurant" form tell the owner a menu address is taken
// while they type, instead of only after they submit. Auth-gated and limited
// to non-staff accounts, mirroring POST /api/restaurants.
export const GET = withApiLogging(async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.actorType === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const existing = await prisma.restaurant.findUnique({
    where: { slug },
    select: { id: true },
  });
  return NextResponse.json({ available: !existing });
});

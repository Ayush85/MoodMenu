import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// Liveness + DB readiness check for Docker healthchecks, nginx upstream
// checks, and the domain-provisioner service.
export async function GET() {
  const start = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      db: "ok",
      uptimeSeconds: Math.floor(process.uptime()),
      durationMs: Date.now() - start,
    });
  } catch (error) {
    logger.error("health.db_unreachable", { error });
    return NextResponse.json(
      { status: "error", db: "unreachable" },
      { status: 503 }
    );
  }
}

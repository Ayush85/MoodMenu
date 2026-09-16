import { NextRequest, NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api-handler";
import { getClientIp } from "@/lib/client-ip";

export const GET = withApiLogging(async function GET(req: NextRequest) {
  return NextResponse.json({ ip: getClientIp(req) });
});

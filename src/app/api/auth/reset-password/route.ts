import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { validatePassword } from "@/lib/password-policy";
import { withApiLogging } from "@/lib/api-handler";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";

export const POST = withApiLogging(async function POST(req: NextRequest) {
  try {
    const requestLimit = checkRateLimit(`reset-password:${getClientIp(req)}`, 10, 15 * 60 * 1000);
    if (!requestLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(requestLimit.retryAfterSeconds) } },
      );
    }

    const body = await req.json();
    const token = String(body?.token || "");
    const password = String(body?.password || "");

    if (!token) {
      return NextResponse.json({ error: "Reset token is required" }, { status: 400 });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { resetToken: token } });
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null },
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
});

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { isValidEmail, normalizeEmail } from "@/lib/password-policy";
import { withApiLogging } from "@/lib/api-handler";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";

export const POST = withApiLogging(async function POST(req: NextRequest) {
  try {
    const requestLimit = checkRateLimit(`forgot-password:${getClientIp(req)}`, 5, 15 * 60 * 1000);
    if (!requestLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(requestLimit.retryAfterSeconds) } },
      );
    }

    const body = await req.json();
    const email = normalizeEmail(String(body?.email || ""));

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    // Always return a generic success response regardless of whether the
    // account exists — otherwise this endpoint becomes an email enumeration
    // oracle for anyone probing it.
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry },
      });

      const baseUrl = process.env.APP_BASE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      await sendPasswordResetEmail(email, resetUrl);
    }

    return NextResponse.json({
      message: "If an account exists for that email, a reset link has been sent.",
    });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
});

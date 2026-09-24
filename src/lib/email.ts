import { Resend } from "resend";

let client: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const resend = getClient();
  if (!resend) {
    // No email provider configured — log so the flow is still testable locally.
    console.warn(`[email] RESEND_API_KEY not set; reset link for ${to}: ${resetUrl}`);
    return;
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM || "Menuor <onboarding@resend.dev>",
    to,
    subject: "Reset your Menuor password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111;">Reset your password</h2>
        <p style="color: #444; font-size: 14px;">
          We received a request to reset the password for your Menuor account.
          This link expires in 1 hour.
        </p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background: #f97316; color: #fff; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Reset Password
          </a>
        </p>
        <p style="color: #888; font-size: 12px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

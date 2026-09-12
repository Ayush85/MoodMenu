import crypto from "crypto";

// A customer's table number arrives via a QR-code URL (`?table=5`). Without
// this, editing the URL bar lets anyone claim to be at any table — calling a
// waiter (or, before it was removed, ordering) to a table they're not
// sitting at. Each printed QR code also carries a short HMAC token (`&t=`)
// binding the table number to this restaurant; the server re-derives and
// compares it before honoring any table-scoped action, so an edited URL
// simply fails validation instead of being trusted.
//
// Reuses NEXTAUTH_SECRET (always set — required for auth) rather than
// introducing a new env var. This isn't an auth credential, just a
// tamper-evidence check, so sharing the secret's entropy for this purpose
// is fine.
function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return secret;
}

export function signTableToken(restaurantId: string, tableNumber: number): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`table:${restaurantId}:${tableNumber}`)
    .digest("base64url")
    .slice(0, 16);
}

export function isValidTableToken(
  restaurantId: string,
  tableNumber: number,
  token: string | null | undefined
): boolean {
  if (!token) return false;
  const expected = signTableToken(restaurantId, tableNumber);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

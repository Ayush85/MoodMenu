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

// `version` lets an owner invalidate one table's printed QR code (lost,
// photographed, or leaked) without touching any other table: bumping
// RestaurantTable.qrVersion changes the signed input for that table only,
// so its old token stops validating while every other table's tokens (and
// any table still on version 0) are completely unaffected. Version 0 is
// deliberately signed with the exact same input as before this existed —
// every already-printed QR code is a version-0 token, and they must keep
// validating byte-for-byte or this would silently break ordering at every
// live restaurant on rollout.
export function signTableToken(restaurantId: string, tableNumber: number, version = 0): string {
  const suffix = version > 0 ? `:${version}` : "";
  return crypto
    .createHmac("sha256", getSecret())
    .update(`table:${restaurantId}:${tableNumber}${suffix}`)
    .digest("base64url")
    .slice(0, 16);
}

export function isValidTableToken(
  restaurantId: string,
  tableNumber: number,
  token: string | null | undefined,
  version = 0
): boolean {
  if (!token) return false;
  const expected = signTableToken(restaurantId, tableNumber, version);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

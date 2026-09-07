// A table session with no new orders for this long is treated as abandoned
// (customer paid off-app and left, or staff forgot to hit "Reset").
export const STALE_SESSION_MS = 4 * 60 * 60 * 1000; // 4 hours

export function isSessionStale(session: { lastActivityAt: Date }): boolean {
  return Date.now() - session.lastActivityAt.getTime() > STALE_SESSION_MS;
}

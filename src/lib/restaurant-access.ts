import { prisma } from "./db";

export type RestaurantAccess =
  | { kind: "OWNER" }
  | { kind: "STAFF"; role: "WAITER" | "COOK" | "CHEF" };

/**
 * Resolves whether a session user (owner or staff) may act on a given
 * restaurant, and if staff, which role — callers use the role to further
 * restrict which actions are allowed (e.g. a waiter can't set an order to
 * PREPARING). Returns null when access should be denied, which callers
 * should surface as 404 rather than 403 to avoid confirming a restaurant
 * id exists to someone with no relationship to it.
 */
export async function getRestaurantAccess(
  restaurantId: string,
  sessionUser: { id: string; actorType?: "USER" | "STAFF" },
): Promise<RestaurantAccess | null> {
  if (sessionUser.actorType === "STAFF") {
    const staffRecord = await prisma.restaurantStaff.findFirst({
      where: { id: sessionUser.id, restaurantId, isActive: true },
      select: { id: true, role: true },
    });
    if (!staffRecord) return null;
    return { kind: "STAFF", role: staffRecord.role as "WAITER" | "COOK" | "CHEF" };
  }

  const ownerRecord = await prisma.restaurant.findFirst({
    where: { id: restaurantId, ownerId: sessionUser.id },
    select: { id: true },
  });
  if (!ownerRecord) return null;
  return { kind: "OWNER" };
}

import { PrismaAccessRepository } from "@/modules/identity-access/infrastructure/prisma/PrismaAccessRepository";
import type { RestaurantAccess } from "@/modules/identity-access/domain/access";

export type { RestaurantAccess } from "@/modules/identity-access/domain/access";

const accessRepository = new PrismaAccessRepository();

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
  return accessRepository.findForActor(restaurantId, {
    id: sessionUser.id,
    type: sessionUser.actorType === "STAFF" ? "STAFF" : "OWNER",
  });
}

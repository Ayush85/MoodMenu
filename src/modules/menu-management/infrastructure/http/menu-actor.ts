import { getRestaurantAccess } from "@/lib/restaurant-access";
import type { ActorContext } from "@/modules/shared/application/actor";

export async function resolveMenuActor(
  restaurantId: string,
  sessionUser: { id: string; actorType?: "USER" | "STAFF" },
): Promise<ActorContext | null> {
  const access = await getRestaurantAccess(restaurantId, sessionUser);
  if (!access) return null;

  return access.kind === "OWNER"
    ? { id: sessionUser.id, type: "OWNER", restaurantId }
    : {
        id: sessionUser.id,
        type: "STAFF",
        role: access.role,
        restaurantId,
      };
}


import { DomainError } from "../../shared/domain/errors";
import type { AccessActor, AccessRepository } from "../ports/access-repository";
import type { RestaurantAccess } from "../domain/access";

export async function resolveRestaurantAccess(
  repository: AccessRepository,
  restaurantId: string,
  actor: AccessActor,
): Promise<RestaurantAccess> {
  const access = await repository.findForActor(restaurantId, actor);
  if (!access) {
    throw new DomainError("NOT_FOUND", "Restaurant not found");
  }

  return access;
}


import type { RestaurantAccess } from "../domain/access";

export type AccessActor = {
  readonly id: string;
  readonly type: "OWNER" | "STAFF";
};

export interface AccessRepository {
  findForActor(
    restaurantId: string,
    actor: AccessActor,
  ): Promise<RestaurantAccess | null>;
}


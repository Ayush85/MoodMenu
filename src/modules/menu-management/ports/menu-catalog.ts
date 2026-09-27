import type { MenuItemSnapshot } from "../domain/menu";

export interface MenuCatalog {
  getAvailableItemSnapshots(
    restaurantId: string,
    itemIds: string[],
  ): Promise<MenuItemSnapshot[]>;
}


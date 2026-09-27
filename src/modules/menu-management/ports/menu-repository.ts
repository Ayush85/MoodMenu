export type {
  CreateMenuItemInput,
  MenuCategory,
  MenuCategoryWithItems,
  MenuImportInput,
  MenuImportResult,
  MenuItem,
  MenuItemPatch,
  MenuManagement,
} from "../domain/menu";

import type {
  CreateMenuItemInput,
  MenuCategory,
  MenuImportInput,
  MenuImportResult,
  MenuItem,
  MenuItemPatch,
  MenuManagement,
} from "../domain/menu";

export interface MenuRepository {
  createCategory(input: {
    restaurantId: string;
    name: string;
    order?: number;
  }): Promise<MenuCategory>;
  findCategory(restaurantId: string, categoryId: string): Promise<MenuCategory | null>;
  updateCategory(
    restaurantId: string,
    categoryId: string,
    patch: { name?: string },
  ): Promise<MenuCategory>;
  reorderCategories(
    restaurantId: string,
    entries: Array<{ id: string; order: number }>,
  ): Promise<void>;
  deleteCategory(restaurantId: string, categoryId: string): Promise<void>;
  createItem(input: CreateMenuItemInput): Promise<MenuItem>;
  findItem(restaurantId: string, itemId: string): Promise<MenuItem | null>;
  updateItem(
    restaurantId: string,
    itemId: string,
    patch: MenuItemPatch,
  ): Promise<MenuItem>;
  moveItem(
    restaurantId: string,
    itemId: string,
    targetCategoryId: string,
  ): Promise<MenuItem>;
  reorderItems(
    restaurantId: string,
    entries: Array<{ id: string; order: number }>,
  ): Promise<void>;
  deleteItem(restaurantId: string, itemId: string): Promise<void>;
  importMenu(restaurantId: string, input: MenuImportInput): Promise<MenuImportResult>;
  getManagementMenu(restaurantId: string): Promise<MenuManagement>;
}

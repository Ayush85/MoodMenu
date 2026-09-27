import {
  filterPublishedMenu,
  validateMenuImport,
  validateMenuItemPatch,
  validateMenuName,
  validateMenuPrice,
  validateMenuTags,
  type MenuImportInput,
  type MenuItemPatch,
  type MenuManagement,
} from "../domain/menu";
import { actorCan, type ActorContext } from "../../shared/application/actor";
import { DomainError } from "../../shared/domain/errors";
import type { MenuCatalog } from "../ports/menu-catalog";
import type { MenuRepository } from "../ports/menu-repository";

function assertCanManageMenu(actor: ActorContext, restaurantId: string): void {
  if (!actorCan(actor, "manage_menu") || actor.restaurantId !== restaurantId) {
    throw new DomainError("FORBIDDEN", "You cannot manage this menu");
  }
}

export class MenuService {
  constructor(
    private readonly repository: MenuRepository,
    private readonly catalog: MenuCatalog,
  ) {}

  async createCategory(
    actor: ActorContext,
    restaurantId: string,
    input: { name: unknown; order?: number },
  ) {
    assertCanManageMenu(actor, restaurantId);
    const name = validateMenuName(input.name);
    return this.repository.createCategory({ restaurantId, name, order: input.order });
  }

  async renameCategory(
    actor: ActorContext,
    restaurantId: string,
    categoryId: string,
    name: unknown,
  ) {
    assertCanManageMenu(actor, restaurantId);
    await this.requireCategory(restaurantId, categoryId);
    return this.repository.updateCategory(restaurantId, categoryId, {
      name: validateMenuName(name),
    });
  }

  async reorderCategories(
    actor: ActorContext,
    restaurantId: string,
    entries: Array<{ id: string; order: number }>,
  ) {
    assertCanManageMenu(actor, restaurantId);
    await Promise.all(entries.map((entry) => this.requireCategory(restaurantId, entry.id)));
    this.validateOrderEntries(entries);
    return this.repository.reorderCategories(restaurantId, entries);
  }

  async deleteCategory(actor: ActorContext, restaurantId: string, categoryId: string) {
    assertCanManageMenu(actor, restaurantId);
    await this.requireCategory(restaurantId, categoryId);
    return this.repository.deleteCategory(restaurantId, categoryId);
  }

  async createItem(
    actor: ActorContext,
    restaurantId: string,
    input: {
      categoryId: string;
      name: unknown;
      description?: string | null;
      price: unknown;
      image?: string | null;
      tags?: unknown;
      isAvailable?: boolean;
      isSpecial?: boolean;
      order?: number;
    },
  ) {
    assertCanManageMenu(actor, restaurantId);
    await this.requireCategory(restaurantId, input.categoryId);
    return this.repository.createItem({
      restaurantId,
      categoryId: input.categoryId,
      name: validateMenuName(input.name),
      description: input.description ?? null,
      price: validateMenuPrice(input.price),
      image: input.image ?? null,
      tags: validateMenuTags(input.tags),
      isAvailable: input.isAvailable ?? true,
      isSpecial: input.isSpecial ?? false,
      order: input.order,
    });
  }

  async updateItem(
    actor: ActorContext,
    restaurantId: string,
    itemId: string,
    input: MenuItemPatch,
  ) {
    assertCanManageMenu(actor, restaurantId);
    await this.requireItem(restaurantId, itemId);
    if (input.categoryId !== undefined) {
      await this.requireCategory(restaurantId, input.categoryId);
    }
    return this.repository.updateItem(
      restaurantId,
      itemId,
      validateMenuItemPatch(input),
    );
  }

  async moveItem(
    actor: ActorContext,
    restaurantId: string,
    itemId: string,
    targetCategoryId: string,
  ) {
    assertCanManageMenu(actor, restaurantId);
    await this.requireItem(restaurantId, itemId);
    await this.requireCategory(restaurantId, targetCategoryId);
    return this.repository.moveItem(restaurantId, itemId, targetCategoryId);
  }

  async reorderItems(
    actor: ActorContext,
    restaurantId: string,
    entries: Array<{ id: string; order: number }>,
  ) {
    assertCanManageMenu(actor, restaurantId);
    await Promise.all(entries.map((entry) => this.requireItem(restaurantId, entry.id)));
    this.validateOrderEntries(entries);
    return this.repository.reorderItems(restaurantId, entries);
  }

  async setAvailability(
    actor: ActorContext,
    restaurantId: string,
    itemId: string,
    isAvailable: boolean,
  ) {
    assertCanManageMenu(actor, restaurantId);
    await this.requireItem(restaurantId, itemId);
    return this.repository.updateItem(restaurantId, itemId, { isAvailable });
  }

  async deleteItem(actor: ActorContext, restaurantId: string, itemId: string) {
    assertCanManageMenu(actor, restaurantId);
    await this.requireItem(restaurantId, itemId);
    return this.repository.deleteItem(restaurantId, itemId);
  }

  async importMenu(
    actor: ActorContext,
    restaurantId: string,
    input: MenuImportInput,
  ) {
    assertCanManageMenu(actor, restaurantId);
    const validated = validateMenuImport(input);
    return this.repository.importMenu(restaurantId, validated);
  }

  async getManagementMenu(restaurantId: string): Promise<MenuManagement> {
    return this.repository.getManagementMenu(restaurantId);
  }

  async getPublishedMenu(restaurantId: string): Promise<MenuManagement> {
    return filterPublishedMenu(await this.repository.getManagementMenu(restaurantId));
  }

  async getAvailableItemSnapshots(restaurantId: string, itemIds: string[]) {
    const snapshots = await this.catalog.getAvailableItemSnapshots(restaurantId, itemIds);
    return snapshots.map((snapshot) => Object.freeze({ ...snapshot }));
  }

  private async requireCategory(restaurantId: string, categoryId: string) {
    const category = await this.repository.findCategory(restaurantId, categoryId);
    if (!category) {
      throw new DomainError("NOT_FOUND", "Category not found");
    }
    return category;
  }

  private async requireItem(restaurantId: string, itemId: string) {
    const item = await this.repository.findItem(restaurantId, itemId);
    if (!item) {
      throw new DomainError("NOT_FOUND", "Item not found");
    }
    return item;
  }

  private validateOrderEntries(entries: Array<{ id: string; order: number }>) {
    for (const entry of entries) {
      if (!entry.id || !Number.isInteger(entry.order) || entry.order < 0) {
        throw new DomainError(
          "VALIDATION_FAILED",
          "Order must be a non-negative integer",
          { field: "order" },
        );
      }
    }
  }
}

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
import type { AuditLogPort } from "../../shared/application/ports";
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
    private readonly auditLog?: AuditLogPort,
  ) {}

  async createCategory(
    actor: ActorContext,
    restaurantId: string,
    input: { name: unknown; order?: number },
  ) {
    assertCanManageMenu(actor, restaurantId);
    const name = validateMenuName(input.name);
    const category = await this.repository.createCategory({ restaurantId, name, order: input.order });
    await this.recordAudit(actor, restaurantId, "menu.category.created", "MenuCategory", category.id);
    return category;
  }

  async renameCategory(
    actor: ActorContext,
    restaurantId: string,
    categoryId: string,
    name: unknown,
  ) {
    assertCanManageMenu(actor, restaurantId);
    await this.requireCategory(restaurantId, categoryId);
    const category = await this.repository.updateCategory(restaurantId, categoryId, {
      name: validateMenuName(name),
    });
    await this.recordAudit(actor, restaurantId, "menu.category.renamed", "MenuCategory", category.id);
    return category;
  }

  async reorderCategories(
    actor: ActorContext,
    restaurantId: string,
    entries: Array<{ id: string; order: number }>,
  ) {
    assertCanManageMenu(actor, restaurantId);
    await Promise.all(entries.map((entry) => this.requireCategory(restaurantId, entry.id)));
    this.validateOrderEntries(entries);
    await this.repository.reorderCategories(restaurantId, entries);
    await this.recordAudit(actor, restaurantId, "menu.categories.reordered", "MenuCategory", undefined, {
      count: entries.length,
    });
  }

  async deleteCategory(actor: ActorContext, restaurantId: string, categoryId: string) {
    assertCanManageMenu(actor, restaurantId);
    await this.requireCategory(restaurantId, categoryId);
    await this.repository.deleteCategory(restaurantId, categoryId);
    await this.recordAudit(actor, restaurantId, "menu.category.deleted", "MenuCategory", categoryId);
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
    const item = await this.repository.createItem({
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
    await this.recordAudit(actor, restaurantId, "menu.item.created", "MenuItem", item.id);
    return item;
  }

  async updateItem(
    actor: ActorContext,
    restaurantId: string,
    itemId: string,
    input: MenuItemPatch,
  ) {
    assertCanManageMenu(actor, restaurantId);
    const currentItem = await this.requireItem(restaurantId, itemId);
    if (input.categoryId !== undefined) {
      await this.requireCategory(restaurantId, input.categoryId);
    }
    const validated = validateMenuItemPatch(input);
    if (input.categoryId !== undefined && input.categoryId !== currentItem.categoryId) {
      const remaining = { ...validated };
      delete remaining.categoryId;
      const moved = await this.repository.moveItem(restaurantId, itemId, input.categoryId);
      const item = Object.keys(remaining).length > 0
        ? this.repository.updateItem(restaurantId, itemId, remaining)
        : moved;
      const updated = await item;
      await this.recordAudit(actor, restaurantId, "menu.item.updated", "MenuItem", updated.id);
      return updated;
    }
    const item = await this.repository.updateItem(restaurantId, itemId, validated);
    await this.recordAudit(actor, restaurantId, "menu.item.updated", "MenuItem", item.id);
    return item;
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
    const item = await this.repository.moveItem(restaurantId, itemId, targetCategoryId);
    await this.recordAudit(actor, restaurantId, "menu.item.moved", "MenuItem", item.id, {
      categoryId: targetCategoryId,
    });
    return item;
  }

  async reorderItems(
    actor: ActorContext,
    restaurantId: string,
    entries: Array<{ id: string; order: number }>,
  ) {
    assertCanManageMenu(actor, restaurantId);
    await Promise.all(entries.map((entry) => this.requireItem(restaurantId, entry.id)));
    this.validateOrderEntries(entries);
    await this.repository.reorderItems(restaurantId, entries);
    await this.recordAudit(actor, restaurantId, "menu.items.reordered", "MenuItem", undefined, {
      count: entries.length,
    });
  }

  async setAvailability(
    actor: ActorContext,
    restaurantId: string,
    itemId: string,
    isAvailable: boolean,
  ) {
    assertCanManageMenu(actor, restaurantId);
    await this.requireItem(restaurantId, itemId);
    const item = await this.repository.updateItem(restaurantId, itemId, { isAvailable });
    await this.recordAudit(actor, restaurantId, "menu.item.availability_changed", "MenuItem", item.id, {
      isAvailable,
    });
    return item;
  }

  async deleteItem(actor: ActorContext, restaurantId: string, itemId: string) {
    assertCanManageMenu(actor, restaurantId);
    await this.requireItem(restaurantId, itemId);
    await this.repository.deleteItem(restaurantId, itemId);
    await this.recordAudit(actor, restaurantId, "menu.item.deleted", "MenuItem", itemId);
  }

  async importMenu(
    actor: ActorContext,
    restaurantId: string,
    input: MenuImportInput,
  ) {
    assertCanManageMenu(actor, restaurantId);
    const validated = validateMenuImport(input);
    const result = await this.repository.importMenu(restaurantId, validated);
    await this.recordAudit(actor, restaurantId, "menu.imported", "Menu", undefined, {
      categoriesCreated: result.categoriesCreated,
      itemsCreated: result.itemsCreated,
    });
    return result;
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

  private async recordAudit(
    actor: ActorContext,
    restaurantId: string,
    action: string,
    entityType: string,
    entityId?: string,
    metadata?: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    if (!this.auditLog) return;
    await this.auditLog.record({
      restaurantId,
      actorId: actor.id,
      actorType: actor.type,
      action,
      entityType,
      entityId,
      metadata,
      occurredAt: new Date(),
    });
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

import assert from "node:assert/strict";
import test from "node:test";

import type { ActorContext } from "../../shared/application/actor";
import { DomainError } from "../../shared/domain/errors";
import type { MenuCatalog } from "../ports/menu-catalog";
import type {
  CreateMenuItemInput,
  MenuCategory,
  MenuImportInput,
  MenuItem,
  MenuManagement,
  MenuRepository,
} from "../ports/menu-repository";
import { MenuService } from "./menu-service";

const owner: ActorContext = {
  id: "owner-1",
  type: "OWNER",
  restaurantId: "restaurant-1",
};
const waiter: ActorContext = {
  id: "staff-1",
  type: "STAFF",
  role: "WAITER",
  restaurantId: "restaurant-1",
};

class InMemoryMenuRepository implements MenuRepository {
  readonly categories: MenuCategory[] = [];
  readonly items: MenuItem[] = [];
  importCalls = 0;

  async createCategory(input: { restaurantId: string; name: string; order?: number }) {
    const category: MenuCategory = {
      id: `category-${this.categories.length + 1}`,
      restaurantId: input.restaurantId,
      name: input.name,
      order: input.order ?? this.categories.length,
    };
    this.categories.push(category);
    return category;
  }

  async findCategory(restaurantId: string, categoryId: string) {
    return this.categories.find(
      (category) => category.restaurantId === restaurantId && category.id === categoryId,
    ) ?? null;
  }

  async updateCategory(restaurantId: string, categoryId: string, patch: { name?: string }) {
    const category = await this.findCategory(restaurantId, categoryId);
    if (!category) throw new DomainError("NOT_FOUND", "Category not found");
    Object.assign(category, patch);
    return category;
  }

  async reorderCategories(restaurantId: string, entries: Array<{ id: string; order: number }>) {
    for (const entry of entries) {
      const category = await this.findCategory(restaurantId, entry.id);
      if (!category) throw new DomainError("NOT_FOUND", "Category not found");
      category.order = entry.order;
    }
  }

  async deleteCategory(restaurantId: string, categoryId: string) {
    const category = await this.findCategory(restaurantId, categoryId);
    if (!category) throw new DomainError("NOT_FOUND", "Category not found");
    this.categories.splice(this.categories.indexOf(category), 1);
  }

  async createItem(input: CreateMenuItemInput) {
    const item: MenuItem = {
      id: `item-${this.items.length + 1}`,
      restaurantId: input.restaurantId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      image: input.image ?? null,
      tags: input.tags ?? [],
      isAvailable: input.isAvailable ?? true,
      isSpecial: input.isSpecial ?? false,
      order: input.order ?? this.items.filter((entry) => entry.categoryId === input.categoryId).length,
    };
    this.items.push(item);
    return item;
  }

  async findItem(restaurantId: string, itemId: string) {
    return this.items.find(
      (item) => item.restaurantId === restaurantId && item.id === itemId,
    ) ?? null;
  }

  async updateItem(restaurantId: string, itemId: string, patch: Partial<MenuItem>) {
    const item = await this.findItem(restaurantId, itemId);
    if (!item) throw new DomainError("NOT_FOUND", "Item not found");
    Object.assign(item, patch);
    return item;
  }

  async moveItem(restaurantId: string, itemId: string, targetCategoryId: string) {
    return this.updateItem(restaurantId, itemId, { categoryId: targetCategoryId });
  }

  async reorderItems(restaurantId: string, entries: Array<{ id: string; order: number }>) {
    for (const entry of entries) {
      await this.updateItem(restaurantId, entry.id, { order: entry.order });
    }
  }

  async deleteItem(restaurantId: string, itemId: string) {
    const item = await this.findItem(restaurantId, itemId);
    if (!item) throw new DomainError("NOT_FOUND", "Item not found");
    this.items.splice(this.items.indexOf(item), 1);
  }

  async importMenu(restaurantId: string, input: MenuImportInput) {
    void restaurantId;
    void input;
    this.importCalls += 1;
  }

  async getManagementMenu(restaurantId: string): Promise<MenuManagement> {
    return {
      categories: this.categories
        .filter((category) => category.restaurantId === restaurantId)
        .map((category) => ({
          ...category,
          items: this.items.filter((item) => item.categoryId === category.id),
        })),
    };
  }
}

const catalog: MenuCatalog = {
  async getAvailableItemSnapshots() {
    return [{ itemId: "item-1", itemName: "Momo", unitPrice: 180 }];
  },
};

test("menu mutations require the restaurant owner", async () => {
  const repository = new InMemoryMenuRepository();
  const service = new MenuService(repository, catalog);

  await assert.rejects(
    service.createCategory(waiter, "restaurant-1", { name: "Momos" }),
    (error: unknown) => error instanceof DomainError && error.code === "FORBIDDEN",
  );
  assert.equal(repository.categories.length, 0);
});

test("menu service validates target category ownership before moving an item", async () => {
  const repository = new InMemoryMenuRepository();
  const service = new MenuService(repository, catalog);
  await repository.createCategory({ restaurantId: "restaurant-1", name: "Momos" });
  await repository.createItem({
    restaurantId: "restaurant-1",
    categoryId: "category-1",
    name: "Momo",
    price: 180,
  });

  await assert.rejects(
    service.moveItem(owner, "restaurant-1", "item-1", "category-from-another-restaurant"),
    (error: unknown) => error instanceof DomainError && error.code === "NOT_FOUND",
  );
});

test("invalid imports are rejected before the repository write begins", async () => {
  const repository = new InMemoryMenuRepository();
  const service = new MenuService(repository, catalog);
  const invalidImport: MenuImportInput = {
    categories: [
      {
        name: "Momos",
        items: [{ name: "Momo", price: -1 }],
      },
    ],
  };

  await assert.rejects(
    service.importMenu(owner, "restaurant-1", invalidImport),
    (error: unknown) => error instanceof DomainError && error.code === "VALIDATION_FAILED",
  );
  assert.equal(repository.importCalls, 0);
});

test("published menu is available to public reads without an actor", async () => {
  const repository = new InMemoryMenuRepository();
  const service = new MenuService(repository, catalog);
  await repository.createCategory({ restaurantId: "restaurant-1", name: "Momos" });
  await repository.createItem({
    restaurantId: "restaurant-1",
    categoryId: "category-1",
    name: "Momo",
    price: 180,
    isAvailable: true,
  });

  const menu = await service.getPublishedMenu("restaurant-1");
  assert.equal(menu.categories[0].items[0].name, "Momo");
});

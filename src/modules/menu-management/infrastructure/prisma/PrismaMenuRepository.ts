import { prisma } from "@/lib/db";
import { DomainError } from "@/modules/shared/domain/errors";
import type {
  CreateMenuItemInput,
  MenuCategory,
  MenuImportInput,
  MenuImportResult,
  MenuItem,
  MenuItemPatch,
  MenuManagement,
  MenuRepository,
} from "../../ports/menu-repository";
import {
  mapMenuCategory,
  mapMenuItem,
  mapMenuManagement,
} from "./menu-mappers";

function notFound(entity: string): DomainError {
  return new DomainError("NOT_FOUND", `${entity} not found`);
}

export class PrismaMenuRepository implements MenuRepository {
  async createCategory(input: {
    restaurantId: string;
    name: string;
    order?: number;
  }): Promise<MenuCategory> {
    const order = input.order ?? ((await prisma.category.aggregate({
      where: { restaurantId: input.restaurantId },
      _max: { order: true },
    }))._max.order ?? -1) + 1;

    const category = await prisma.category.create({
      data: {
        restaurantId: input.restaurantId,
        name: input.name,
        order,
      },
    });

    return mapMenuCategory(category);
  }

  async findCategory(
    restaurantId: string,
    categoryId: string,
  ): Promise<MenuCategory | null> {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, restaurantId },
    });
    return category ? mapMenuCategory(category) : null;
  }

  async updateCategory(
    restaurantId: string,
    categoryId: string,
    patch: { name?: string },
  ): Promise<MenuCategory> {
    await this.requireCategoryRecord(restaurantId, categoryId);
    const category = await prisma.category.update({
      where: { id: categoryId },
      data: patch,
    });
    return mapMenuCategory(category);
  }

  async reorderCategories(
    restaurantId: string,
    entries: Array<{ id: string; order: number }>,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        const category = await tx.category.findFirst({
          where: { id: entry.id, restaurantId },
          select: { id: true },
        });
        if (!category) throw notFound("Category");
        await tx.category.update({
          where: { id: entry.id },
          data: { order: entry.order },
        });
      }
    });
  }

  async deleteCategory(restaurantId: string, categoryId: string): Promise<void> {
    await this.requireCategoryRecord(restaurantId, categoryId);
    await prisma.category.delete({ where: { id: categoryId } });
  }

  async createItem(input: CreateMenuItemInput): Promise<MenuItem> {
    await this.requireCategoryRecord(input.restaurantId, input.categoryId);
    const order = input.order ?? ((await prisma.menuItem.aggregate({
      where: { categoryId: input.categoryId },
      _max: { order: true },
    }))._max.order ?? -1) + 1;

    const item = await prisma.menuItem.create({
      data: {
        categoryId: input.categoryId,
        name: input.name,
        description: input.description ?? null,
        price: input.price,
        image: input.image ?? null,
        tags: input.tags ?? [],
        isAvailable: input.isAvailable ?? true,
        isSpecial: input.isSpecial ?? false,
        order,
      },
      include: { category: { select: { restaurantId: true } } },
    });

    return mapMenuItem(item, item.category.restaurantId);
  }

  async findItem(restaurantId: string, itemId: string): Promise<MenuItem | null> {
    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, category: { restaurantId } },
      include: { category: { select: { restaurantId: true } } },
    });
    return item ? mapMenuItem(item, item.category.restaurantId) : null;
  }

  async updateItem(
    restaurantId: string,
    itemId: string,
    patch: MenuItemPatch,
  ): Promise<MenuItem> {
    await this.requireItemRecord(restaurantId, itemId);
    const item = await prisma.menuItem.update({
      where: { id: itemId },
      data: patch,
      include: { category: { select: { restaurantId: true } } },
    });
    return mapMenuItem(item, item.category.restaurantId);
  }

  async moveItem(
    restaurantId: string,
    itemId: string,
    targetCategoryId: string,
  ): Promise<MenuItem> {
    await this.requireItemRecord(restaurantId, itemId);
    await this.requireCategoryRecord(restaurantId, targetCategoryId);
    const maxOrder = await prisma.menuItem.aggregate({
      where: { categoryId: targetCategoryId },
      _max: { order: true },
    });
    const item = await prisma.menuItem.update({
      where: { id: itemId },
      data: {
        categoryId: targetCategoryId,
        order: (maxOrder._max.order ?? -1) + 1,
      },
      include: { category: { select: { restaurantId: true } } },
    });
    return mapMenuItem(item, item.category.restaurantId);
  }

  async reorderItems(
    restaurantId: string,
    entries: Array<{ id: string; order: number }>,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        const item = await tx.menuItem.findFirst({
          where: { id: entry.id, category: { restaurantId } },
          select: { id: true },
        });
        if (!item) throw notFound("Item");
        await tx.menuItem.update({
          where: { id: entry.id },
          data: { order: entry.order },
        });
      }
    });
  }

  async deleteItem(restaurantId: string, itemId: string): Promise<void> {
    await this.requireItemRecord(restaurantId, itemId);
    await prisma.menuItem.delete({ where: { id: itemId } });
  }

  async importMenu(
    restaurantId: string,
    input: MenuImportInput,
  ): Promise<MenuImportResult> {
    return prisma.$transaction(async (tx) => {
      const existingCategories = await tx.category.findMany({
        where: { restaurantId },
        select: { id: true, name: true, order: true },
      });
      const categoryMap = new Map(
        existingCategories.map((category) => [category.name.trim().toLowerCase(), category.id]),
      );
      const maxCategoryOrder = existingCategories.reduce(
        (max, category) => Math.max(max, category.order),
        -1,
      );
      let nextCategoryOrder = maxCategoryOrder + 1;
      let categoriesCreated = 0;
      const createdItems: MenuImportResult["items"] = [];

      for (const categoryInput of input.categories) {
        const categoryKey = categoryInput.name.toLowerCase();
        let categoryId = categoryMap.get(categoryKey);

        if (!categoryId) {
          const category = await tx.category.create({
            data: {
              restaurantId,
              name: categoryInput.name,
              order: categoryInput.order ?? nextCategoryOrder,
            },
            select: { id: true },
          });
          categoryId = category.id;
          categoryMap.set(categoryKey, categoryId);
          categoriesCreated += 1;
          nextCategoryOrder += 1;
        }

        const maxItemOrder = await tx.menuItem.aggregate({
          where: { categoryId },
          _max: { order: true },
        });
        let nextItemOrder = (maxItemOrder._max.order ?? -1) + 1;

        for (const itemInput of categoryInput.items) {
          const item = await tx.menuItem.create({
            data: {
              categoryId,
              name: itemInput.name,
              description: itemInput.description ?? null,
              price: itemInput.price,
              image: itemInput.image ?? null,
              tags: itemInput.tags ?? [],
              isAvailable: itemInput.isAvailable ?? true,
              isSpecial: itemInput.isSpecial ?? false,
              order: itemInput.order ?? nextItemOrder,
            },
            select: { id: true, name: true, description: true },
          });
          nextItemOrder += 1;
          createdItems.push(item);
        }
      }

      return {
        categoriesCreated,
        itemsCreated: createdItems.length,
        items: createdItems,
      };
    }, { timeout: 30000, maxWait: 10000 });
  }

  async getManagementMenu(restaurantId: string): Promise<MenuManagement> {
    const categories = await prisma.category.findMany({
      where: { restaurantId },
      orderBy: { order: "asc" },
      include: { items: { orderBy: { order: "asc" } } },
    });
    return mapMenuManagement(categories);
  }

  private async requireCategoryRecord(restaurantId: string, categoryId: string) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, restaurantId },
      select: { id: true },
    });
    if (!category) throw notFound("Category");
    return category;
  }

  private async requireItemRecord(restaurantId: string, itemId: string) {
    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, category: { restaurantId } },
      select: { id: true },
    });
    if (!item) throw notFound("Item");
    return item;
  }
}


import { DomainError } from "../../shared/domain/errors";

export type MenuCategory = {
  id: string;
  restaurantId: string;
  name: string;
  order: number;
};

export type MenuItem = {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  tags: string[];
  isAvailable: boolean;
  isSpecial: boolean;
  order: number;
};

export type MenuItemSnapshot = {
  itemId: string;
  itemName: string;
  unitPrice: number;
};

export type MenuCategoryWithItems = MenuCategory & { items: MenuItem[] };

export type MenuManagement = { categories: MenuCategoryWithItems[] };

export type CreateMenuItemInput = {
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  tags?: string[];
  isAvailable?: boolean;
  isSpecial?: boolean;
  order?: number;
};

export type MenuItemPatch = Partial<
  Pick<
    MenuItem,
    | "name"
    | "description"
    | "price"
    | "image"
    | "tags"
    | "isAvailable"
    | "isSpecial"
    | "categoryId"
    | "order"
  >
>;

export type MenuImportItemInput = {
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  tags?: string[];
  isAvailable?: boolean;
  isSpecial?: boolean;
  order?: number;
};

export type MenuImportCategoryInput = {
  name: string;
  order?: number;
  items: MenuImportItemInput[];
};

export type MenuImportInput = {
  categories: MenuImportCategoryInput[];
};

export type MenuImportResult = {
  categoriesCreated: number;
  itemsCreated: number;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
};

function validationError(message: string, field?: string): DomainError {
  return new DomainError(
    "VALIDATION_FAILED",
    message,
    field ? { field } : undefined,
  );
}

export function validateMenuName(value: unknown, field = "name"): string {
  if (typeof value !== "string") {
    throw validationError("A name is required", field);
  }

  const name = value.trim();
  if (!name) {
    throw validationError("A name is required", field);
  }
  if (name.length > 120) {
    throw validationError("A name must be 120 characters or fewer", field);
  }

  return name;
}

export function validateMenuPrice(value: unknown, field = "price"): number {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && value.trim() === "")
  ) {
    throw validationError("A valid price is required", field);
  }

  const price = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(price) || price < 0 || price > 10000000) {
    throw validationError("Price must be a finite non-negative amount", field);
  }

  return price;
}

export function validateMenuTags(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw validationError("Tags must be a list", "tags");
  }

  return value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function assertBelongsToRestaurant(
  entity: { restaurantId: string },
  restaurantId: string,
  entityName = "Resource",
): void {
  if (entity.restaurantId !== restaurantId) {
    throw new DomainError("NOT_FOUND", `${entityName} not found`);
  }
}

export function createMenuItemSnapshot(item: MenuItem): MenuItemSnapshot {
  return Object.freeze({
    itemId: item.id,
    itemName: item.name,
    unitPrice: item.price,
  });
}

export function filterPublishedMenu(menu: MenuManagement): MenuManagement {
  return {
    categories: menu.categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => item.isAvailable),
      }))
      .filter((category) => category.items.length > 0),
  };
}

export function validateMenuItemPatch(patch: MenuItemPatch): MenuItemPatch {
  const next: MenuItemPatch = { ...patch };
  if (patch.name !== undefined) next.name = validateMenuName(patch.name);
  if (patch.price !== undefined) next.price = validateMenuPrice(patch.price);
  if (patch.tags !== undefined) next.tags = validateMenuTags(patch.tags);
  if (patch.order !== undefined && (!Number.isInteger(patch.order) || patch.order < 0)) {
    throw validationError("Order must be a non-negative integer", "order");
  }
  return next;
}

export function validateMenuImport(input: MenuImportInput): MenuImportInput {
  if (!input || !Array.isArray(input.categories)) {
    throw validationError("Menu categories are required", "categories");
  }

  let itemCount = 0;
  const categories = input.categories.map((category, categoryIndex) => {
    const name = validateMenuName(category.name, `categories[${categoryIndex}].name`);
    if (!Array.isArray(category.items)) {
      throw validationError(
        "Category items must be a list",
        `categories[${categoryIndex}].items`,
      );
    }
    if (category.order !== undefined && (!Number.isInteger(category.order) || category.order < 0)) {
      throw validationError("Order must be a non-negative integer", "order");
    }

    const items = category.items.map((item, itemIndex) => {
      itemCount += 1;
      const name = validateMenuName(
        item.name,
        `categories[${categoryIndex}].items[${itemIndex}].name`,
      );
      const price = validateMenuPrice(
        item.price,
        `categories[${categoryIndex}].items[${itemIndex}].price`,
      );
      const tags = validateMenuTags(item.tags);
      if (item.order !== undefined && (!Number.isInteger(item.order) || item.order < 0)) {
        throw validationError("Order must be a non-negative integer", "order");
      }
      return {
        ...item,
        name,
        price,
        tags,
      };
    });

    return { ...category, name, items };
  });

  if (itemCount > 500) {
    throw validationError("A menu import cannot contain more than 500 items", "items");
  }

  return { categories };
}

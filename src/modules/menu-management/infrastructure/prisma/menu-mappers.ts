import type {
  MenuCategory,
  MenuCategoryWithItems,
  MenuItem,
  MenuManagement,
} from "../../domain/menu";

type MenuItemRecord = {
  id: string;
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

type CategoryRecord = {
  id: string;
  restaurantId: string;
  name: string;
  order: number;
  items?: MenuItemRecord[];
};

export function mapMenuCategory(record: CategoryRecord): MenuCategory {
  return {
    id: record.id,
    restaurantId: record.restaurantId,
    name: record.name,
    order: record.order,
  };
}

export function mapMenuItem(
  record: MenuItemRecord,
  restaurantId: string,
): MenuItem {
  return {
    id: record.id,
    restaurantId,
    categoryId: record.categoryId,
    name: record.name,
    description: record.description,
    price: record.price,
    image: record.image,
    tags: [...record.tags],
    isAvailable: record.isAvailable,
    isSpecial: record.isSpecial,
    order: record.order,
  };
}

export function mapMenuManagement(records: CategoryRecord[]): MenuManagement {
  const categories: MenuCategoryWithItems[] = records.map((record) => ({
    ...mapMenuCategory(record),
    items: (record.items ?? []).map((item) => mapMenuItem(item, record.restaurantId)),
  }));

  return { categories };
}


import { prisma } from "@/lib/db";
import type { MenuItemSnapshot } from "../../domain/menu";
import type { MenuCatalog } from "../../ports/menu-catalog";

export class PrismaMenuCatalog implements MenuCatalog {
  async getAvailableItemSnapshots(
    restaurantId: string,
    itemIds: string[],
  ): Promise<MenuItemSnapshot[]> {
    if (itemIds.length === 0) return [];

    const items = await prisma.menuItem.findMany({
      where: {
        id: { in: itemIds },
        isAvailable: true,
        category: { restaurantId },
      },
      select: { id: true, name: true, price: true },
    });
    const byId = new Map(items.map((item) => [item.id, item]));

    return itemIds.flatMap((itemId) => {
      const item = byId.get(itemId);
      return item
        ? [{ itemId: item.id, itemName: item.name, unitPrice: item.price }]
        : [];
    });
  }
}


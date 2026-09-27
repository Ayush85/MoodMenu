import { prisma } from "@/lib/db";
import type {
  CustomerTableActorRepository,
  CustomerTableLookup,
} from "../../application/customer-table-actor";

export class PrismaCustomerTableActorRepository implements CustomerTableActorRepository {
  async findBySlugAndTable(slug: string, tableNumber: number): Promise<CustomerTableLookup> {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: {
        id: true,
        ownerId: true,
        allowedIp: true,
        tables: {
          where: { number: tableNumber },
          select: { id: true, number: true, label: true, qrVersion: true },
        },
      },
    });

    return {
      restaurant: restaurant
        ? { id: restaurant.id, ownerId: restaurant.ownerId, allowedIp: restaurant.allowedIp }
        : null,
      table: restaurant?.tables[0] ?? null,
    };
  }
}


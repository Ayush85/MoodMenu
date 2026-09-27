import { prisma } from "@/lib/db";
import type { StaffRole } from "@/modules/shared/application/actor";
import type { RestaurantAccess } from "../../domain/access";
import type {
  AccessActor,
  AccessRepository,
} from "../../ports/access-repository";

export class PrismaAccessRepository implements AccessRepository {
  async findForActor(
    restaurantId: string,
    actor: AccessActor,
  ): Promise<RestaurantAccess | null> {
    if (actor.type === "STAFF") {
      const staffRecord = await prisma.restaurantStaff.findFirst({
        where: { id: actor.id, restaurantId, isActive: true },
        select: { role: true },
      });

      return staffRecord
        ? { kind: "STAFF", role: staffRecord.role as StaffRole }
        : null;
    }

    const ownerRecord = await prisma.restaurant.findFirst({
      where: { id: restaurantId, ownerId: actor.id },
      select: { id: true },
    });

    return ownerRecord ? { kind: "OWNER" } : null;
  }
}


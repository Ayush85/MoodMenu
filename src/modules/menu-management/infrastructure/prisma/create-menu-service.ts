import { MenuService } from "../../application/menu-service";
import { PrismaMenuCatalog } from "./PrismaMenuCatalog";
import { PrismaMenuRepository } from "./PrismaMenuRepository";
import { PrismaAuditLog } from "@/modules/shared/infrastructure/prisma/PrismaAuditLog";

export function createPrismaMenuService(): MenuService {
  return new MenuService(
    new PrismaMenuRepository(),
    new PrismaMenuCatalog(),
    new PrismaAuditLog(),
  );
}

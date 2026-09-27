import { MenuService } from "../../application/menu-service";
import { PrismaMenuCatalog } from "./PrismaMenuCatalog";
import { PrismaMenuRepository } from "./PrismaMenuRepository";

export function createPrismaMenuService(): MenuService {
  return new MenuService(new PrismaMenuRepository(), new PrismaMenuCatalog());
}


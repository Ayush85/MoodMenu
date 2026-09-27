import { PrismaMenuCatalog } from "@/modules/menu-management/infrastructure/prisma/PrismaMenuCatalog";
import { OrderService } from "../../application/order-service";
import { PrismaOrderRepository } from "./PrismaOrderRepository";
import { PrismaTableService } from "@/modules/table-service/infrastructure/prisma/PrismaTableService";
import { PrismaAuditLog } from "@/modules/shared/infrastructure/prisma/PrismaAuditLog";

export function createPrismaOrderService(): OrderService {
  return new OrderService({
    menuCatalog: new PrismaMenuCatalog(),
    tableService: new PrismaTableService(),
    orderRepository: new PrismaOrderRepository(),
    clock: { now: () => new Date() },
    auditLog: new PrismaAuditLog(),
  });
}

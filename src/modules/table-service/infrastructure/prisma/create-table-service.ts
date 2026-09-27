import { PrismaTableService } from "./PrismaTableService";
import { PrismaAuditLog } from "@/modules/shared/infrastructure/prisma/PrismaAuditLog";

export function createPrismaTableService(): PrismaTableService {
  return new PrismaTableService(new PrismaAuditLog());
}

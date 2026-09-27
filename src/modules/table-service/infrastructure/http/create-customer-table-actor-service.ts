import { CustomerTableActorService } from "../../application/customer-table-actor";
import { PrismaCustomerTableActorRepository } from "../prisma/PrismaCustomerTableActorRepository";

export function createCustomerTableActorService(): CustomerTableActorService {
  return new CustomerTableActorService(new PrismaCustomerTableActorRepository());
}


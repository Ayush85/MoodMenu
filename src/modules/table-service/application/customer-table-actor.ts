import { isValidTableToken } from "@/lib/table-token";
import type { ActorContext } from "../../shared/application/actor";
import { DomainError } from "../../shared/domain/errors";

export type CustomerTableLookup = {
  restaurant: {
    id: string;
    ownerId: string;
    allowedIp: string | null;
  } | null;
  table: {
    id: string;
    number: number;
    label: string | null;
    qrVersion: number;
  } | null;
};

export interface CustomerTableActorRepository {
  findBySlugAndTable(slug: string, tableNumber: number): Promise<CustomerTableLookup>;
}

export type CustomerTableActor = ActorContext & {
  type: "CUSTOMER";
  restaurantId: string;
  tableId: string;
  tableNumber: number;
  tableLabel: string | null;
  ownerId: string;
  allowedIp: string | null;
};

export class CustomerTableActorService {
  constructor(
    private readonly repository: CustomerTableActorRepository,
    private readonly verifyToken: typeof isValidTableToken = isValidTableToken,
  ) {}

  async resolve(input: {
    slug: string;
    tableNumber: unknown;
    tableToken: unknown;
  }): Promise<CustomerTableActor> {
    const tableNumber = Number(input.tableNumber);
    if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 9999) {
      throw new DomainError("VALIDATION_FAILED", "Please scan the QR code at your table to order");
    }
    if (typeof input.tableToken !== "string" || !input.tableToken) {
      throw new DomainError("VALIDATION_FAILED", "Please scan the QR code at your table to order");
    }

    const lookup = await this.repository.findBySlugAndTable(input.slug, tableNumber);
    if (!lookup.restaurant) throw new DomainError("NOT_FOUND", "Restaurant not found");
    if (!lookup.table) throw new DomainError("NOT_FOUND", "Table not found");
    if (!this.verifyToken(
      lookup.restaurant.id,
      tableNumber,
      input.tableToken,
      lookup.table.qrVersion,
    )) {
      throw new DomainError(
        "VALIDATION_FAILED",
        "This table link is no longer valid. Please scan the QR code again.",
      );
    }

    return {
      id: lookup.table.id,
      type: "CUSTOMER",
      restaurantId: lookup.restaurant.id,
      tableId: lookup.table.id,
      tableNumber: lookup.table.number,
      tableLabel: lookup.table.label,
      ownerId: lookup.restaurant.ownerId,
      allowedIp: lookup.restaurant.allowedIp,
    };
  }
}


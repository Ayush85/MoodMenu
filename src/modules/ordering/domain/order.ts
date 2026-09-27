import type { Clock } from "../../shared/application/ports";
import { DomainError } from "../../shared/domain/errors";
import type { MenuItemSnapshot } from "../../menu-management/domain/menu";
import {
  allowedNextStatuses,
  canAdvanceOrder,
  type OrderCapability,
  type OrderStatus,
} from "./order-status";

export type OrderLine = {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderTable = {
  id: string;
  number: number;
  label: string | null;
};

export type OrderProps = {
  id?: string;
  restaurantId: string;
  tableId: string;
  sessionId: string;
  status: OrderStatus;
  note: string | null;
  lines: OrderLine[];
  total: number;
  createdAt: Date;
  updatedAt: Date;
  customerRequestId?: string | null;
  table?: OrderTable;
};

export type CreateOrderInput = {
  id?: string;
  restaurantId: string;
  tableId: string;
  sessionId: string;
  lines: Array<{ snapshot: MenuItemSnapshot; quantity: number }>;
  note?: string | null;
  createdAt: Date;
  customerRequestId?: string | null;
};

function validationError(message: string, field?: string): DomainError {
  return new DomainError(
    "VALIDATION_FAILED",
    message,
    field ? { field } : undefined,
  );
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export class Order {
  readonly id?: string;
  readonly restaurantId: string;
  readonly tableId: string;
  readonly sessionId: string;
  readonly status: OrderStatus;
  readonly note: string | null;
  readonly lines: OrderLine[];
  readonly total: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly customerRequestId?: string | null;
  readonly table?: OrderTable;

  private constructor(props: OrderProps) {
    this.id = props.id;
    this.restaurantId = props.restaurantId;
    this.tableId = props.tableId;
    this.sessionId = props.sessionId;
    this.status = props.status;
    this.note = props.note;
    this.lines = props.lines;
    this.total = props.total;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.customerRequestId = props.customerRequestId;
    this.table = props.table;
  }

  static create(input: CreateOrderInput): Order {
    if (!input.restaurantId || !input.tableId || !input.sessionId) {
      throw validationError("Restaurant, table, and session are required");
    }
    if (!Array.isArray(input.lines) || input.lines.length === 0 || input.lines.length > 50) {
      throw validationError("An order must contain between 1 and 50 items", "lines");
    }

    const lines = input.lines.map(({ snapshot, quantity }, index) => {
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        throw validationError("Each item quantity must be between 1 and 20", `lines[${index}].quantity`);
      }
      if (!snapshot.itemId || !snapshot.itemName || !Number.isFinite(snapshot.unitPrice) || snapshot.unitPrice < 0) {
        throw validationError("Order item snapshot is invalid", `lines[${index}]`);
      }
      const lineTotal = roundMoney(snapshot.unitPrice * quantity);
      return {
        itemId: snapshot.itemId,
        itemName: snapshot.itemName,
        quantity,
        unitPrice: snapshot.unitPrice,
        lineTotal,
      };
    });

    const total = roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));
    if (!Number.isFinite(total) || total > 100000) {
      throw validationError("This order total is too large", "total");
    }

    return new Order({
      id: input.id,
      restaurantId: input.restaurantId,
      tableId: input.tableId,
      sessionId: input.sessionId,
      status: "NEW",
      note: input.note?.trim().slice(0, 240) || null,
      lines,
      total,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      customerRequestId: input.customerRequestId ?? null,
    });
  }

  static fromPersistence(props: OrderProps): Order {
    return new Order({ ...props, lines: props.lines.map((line) => ({ ...line })) });
  }

  withId(id: string): Order {
    return new Order({ ...this.toProps(), id });
  }

  advanceTo(nextStatus: OrderStatus, capability: OrderCapability, clock: Clock): Order {
    if (!allowedNextStatuses[this.status].includes(nextStatus)) {
      throw new DomainError(
        "CONFLICT",
        `Order cannot move from ${this.status} to ${nextStatus}`,
      );
    }
    if (!canAdvanceOrder(capability, nextStatus)) {
      throw new DomainError("FORBIDDEN", "You cannot set this order status");
    }

    return new Order({
      ...this.toProps(),
      status: nextStatus,
      updatedAt: clock.now(),
    });
  }

  private toProps(): OrderProps {
    return {
      id: this.id,
      restaurantId: this.restaurantId,
      tableId: this.tableId,
      sessionId: this.sessionId,
      status: this.status,
      note: this.note,
      lines: this.lines.map((line) => ({ ...line })),
      total: this.total,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      customerRequestId: this.customerRequestId,
      table: this.table,
    };
  }
}

export { type OrderStatus } from "./order-status";

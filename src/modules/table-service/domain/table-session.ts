import type { Clock } from "../../shared/application/ports";
import { DomainError } from "../../shared/domain/errors";
import type { OrderStatus } from "../../ordering/domain/order-status";

export type TableSessionStatus = "ACTIVE" | "CLOSED";

export type TableSessionProps = {
  id: string;
  restaurantId: string;
  tableId: string;
  status: TableSessionStatus;
  totalAmount: number;
  startedAt: Date;
  lastActivityAt: Date;
  endedAt: Date | null;
};

export type CreateTableSessionInput = {
  id: string;
  restaurantId: string;
  tableId: string;
  startedAt: Date;
};

export class TableSession {
  readonly id: string;
  readonly restaurantId: string;
  readonly tableId: string;
  readonly status: TableSessionStatus;
  readonly totalAmount: number;
  readonly startedAt: Date;
  readonly lastActivityAt: Date;
  readonly endedAt: Date | null;

  private constructor(props: TableSessionProps) {
    this.id = props.id;
    this.restaurantId = props.restaurantId;
    this.tableId = props.tableId;
    this.status = props.status;
    this.totalAmount = props.totalAmount;
    this.startedAt = props.startedAt;
    this.lastActivityAt = props.lastActivityAt;
    this.endedAt = props.endedAt;
  }

  static create(input: CreateTableSessionInput): TableSession {
    if (!input.id || !input.restaurantId || !input.tableId) {
      throw new DomainError("VALIDATION_FAILED", "Session identity is required");
    }
    return new TableSession({
      id: input.id,
      restaurantId: input.restaurantId,
      tableId: input.tableId,
      status: "ACTIVE",
      totalAmount: 0,
      startedAt: input.startedAt,
      lastActivityAt: input.startedAt,
      endedAt: null,
    });
  }

  static fromPersistence(props: TableSessionProps): TableSession {
    return new TableSession(props);
  }

  canClose(orderStatuses: OrderStatus[]): boolean {
    return orderStatuses.every((status) => status === "PAID" || status === "CANCELED");
  }

  close(clock: Clock): TableSession {
    if (this.status === "CLOSED") return this;
    const endedAt = clock.now();
    return new TableSession({
      ...this.toProps(),
      status: "CLOSED",
      endedAt,
      lastActivityAt: endedAt,
    });
  }

  withActivity(totalAmount: number, clock: Clock): TableSession {
    if (this.status === "CLOSED") {
      throw new DomainError("CONFLICT", "The table session is already closed");
    }
    return new TableSession({
      ...this.toProps(),
      totalAmount: this.totalAmount + totalAmount,
      lastActivityAt: clock.now(),
    });
  }

  private toProps(): TableSessionProps {
    return {
      id: this.id,
      restaurantId: this.restaurantId,
      tableId: this.tableId,
      status: this.status,
      totalAmount: this.totalAmount,
      startedAt: this.startedAt,
      lastActivityAt: this.lastActivityAt,
      endedAt: this.endedAt,
    };
  }
}

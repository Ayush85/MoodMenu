import type { Clock } from "../../shared/application/ports";
import { DomainError } from "../../shared/domain/errors";

export type WaiterCallStatus = "PENDING" | "ACKNOWLEDGED" | "RESOLVED";

export type WaiterCallProps = {
  id: string;
  restaurantId: string;
  tableId: string;
  message: string | null;
  status: WaiterCallStatus;
  createdAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
  handledBy: string | null;
  table?: { number: number; label: string | null };
};

export type CreateWaiterCallInput = {
  id: string;
  restaurantId: string;
  tableId: string;
  message?: string | null;
  createdAt: Date;
};

export class WaiterCall {
  readonly id: string;
  readonly restaurantId: string;
  readonly tableId: string;
  readonly message: string | null;
  readonly status: WaiterCallStatus;
  readonly createdAt: Date;
  readonly acknowledgedAt: Date | null;
  readonly resolvedAt: Date | null;
  readonly handledBy: string | null;
  readonly table?: { number: number; label: string | null };

  private constructor(props: WaiterCallProps) {
    this.id = props.id;
    this.restaurantId = props.restaurantId;
    this.tableId = props.tableId;
    this.message = props.message;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.acknowledgedAt = props.acknowledgedAt;
    this.resolvedAt = props.resolvedAt;
    this.handledBy = props.handledBy;
    this.table = props.table;
  }

  static create(input: CreateWaiterCallInput): WaiterCall {
    if (!input.id || !input.restaurantId || !input.tableId) {
      throw new DomainError("VALIDATION_FAILED", "Waiter call identity is required");
    }
    return new WaiterCall({
      id: input.id,
      restaurantId: input.restaurantId,
      tableId: input.tableId,
      message: input.message?.trim().slice(0, 200) || null,
      status: "PENDING",
      createdAt: input.createdAt,
      acknowledgedAt: null,
      resolvedAt: null,
      handledBy: null,
    });
  }

  static fromPersistence(props: WaiterCallProps): WaiterCall {
    return new WaiterCall(props);
  }

  advanceTo(
    nextStatus: WaiterCallStatus,
    clock: Clock,
    handledBy: string,
  ): WaiterCall {
    const allowed = this.status === "PENDING"
      ? ["ACKNOWLEDGED", "RESOLVED"]
      : this.status === "ACKNOWLEDGED"
        ? ["RESOLVED"]
        : [];
    if (!allowed.includes(nextStatus)) {
      throw new DomainError(
        "CONFLICT",
        `Cannot move a call from ${this.status} to ${nextStatus}`,
      );
    }
    const now = clock.now();
    return new WaiterCall({
      ...this.toProps(),
      status: nextStatus,
      handledBy,
      acknowledgedAt: nextStatus === "ACKNOWLEDGED" ? now : this.acknowledgedAt,
      resolvedAt: nextStatus === "RESOLVED" ? now : this.resolvedAt,
    });
  }

  private toProps(): WaiterCallProps {
    return {
      id: this.id,
      restaurantId: this.restaurantId,
      tableId: this.tableId,
      message: this.message,
      status: this.status,
      createdAt: this.createdAt,
      acknowledgedAt: this.acknowledgedAt,
      resolvedAt: this.resolvedAt,
      handledBy: this.handledBy,
      table: this.table,
    };
  }
}

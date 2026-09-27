import type { OrderStatus } from "../../ordering/domain/order-status";
import type { TableSession } from "../domain/table-session";
import type { WaiterCall, WaiterCallStatus } from "../domain/waiter-call";

export type TableReference = {
  id: string;
  restaurantId: string;
  number: number;
  label: string | null;
};

export interface TableService {
  findTable(restaurantId: string, tableId: string): Promise<TableReference | null>;
  getOrStartActiveSession(restaurantId: string, tableId: string): Promise<TableSession>;
  closeIfAllOrdersTerminal(sessionId: string, now: Date): Promise<void>;
}

export interface WaiterCallRepository {
  hasRecentPending(tableId: string, since: Date): Promise<boolean>;
  create(call: WaiterCall): Promise<WaiterCall>;
  findById(restaurantId: string, callId: string): Promise<WaiterCall | null>;
  listByRestaurant(restaurantId: string): Promise<WaiterCall[]>;
  save(call: WaiterCall): Promise<WaiterCall>;
}

export type TerminalOrderStatuses = Extract<OrderStatus, "PAID" | "CANCELED">;
export type { WaiterCallStatus };


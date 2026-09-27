export type OrderStatus = "NEW" | "PREPARING" | "SERVED" | "PAID" | "CANCELED";

export type OrderCapability = "OWNER" | "WAITER" | "KITCHEN";

export const allowedNextStatuses: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  NEW: ["PREPARING", "CANCELED"],
  PREPARING: ["SERVED", "CANCELED"],
  SERVED: ["PAID"],
  PAID: [],
  CANCELED: [],
};

export function canAdvanceOrder(
  capability: OrderCapability,
  nextStatus: OrderStatus,
): boolean {
  if (capability === "OWNER") return true;
  if (capability === "WAITER") return ["SERVED", "PAID", "CANCELED"].includes(nextStatus);
  return ["PREPARING", "SERVED", "CANCELED"].includes(nextStatus);
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return status === "PAID" || status === "CANCELED";
}


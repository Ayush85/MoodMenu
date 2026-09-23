import type { ActorType, OrderStatus, StaffRole } from "./types";

export function getAllowedOrderStatuses(
  actorType: ActorType | undefined,
  staffRole: StaffRole | undefined,
): OrderStatus[] {
  if (actorType === "USER") return ["NEW", "PREPARING", "SERVED", "PAID", "CANCELED"];
  if (staffRole === "WAITER") return ["SERVED", "PAID", "CANCELED"];
  if (staffRole === "COOK" || staffRole === "CHEF") {
    return ["PREPARING", "SERVED", "CANCELED"];
  }
  return [];
}

export function getNextSuggestedStatus(
  actorType: ActorType | undefined,
  staffRole: StaffRole | undefined,
  currentStatus: OrderStatus,
): OrderStatus | null {
  if (actorType === "USER") {
    if (currentStatus === "NEW") return "PREPARING";
    if (currentStatus === "PREPARING") return "SERVED";
    if (currentStatus === "SERVED") return "PAID";
    return null;
  }

  if (staffRole === "WAITER") {
    if (currentStatus === "NEW" || currentStatus === "PREPARING") return "SERVED";
    if (currentStatus === "SERVED") return "PAID";
    return null;
  }

  if (staffRole === "COOK" || staffRole === "CHEF") {
    if (currentStatus === "NEW") return "PREPARING";
    if (currentStatus === "PREPARING") return "SERVED";
  }

  return null;
}

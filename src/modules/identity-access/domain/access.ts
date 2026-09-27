import type { Capability, StaffRole } from "../../shared/application/actor";

export type RestaurantAccess =
  | { readonly kind: "OWNER" }
  | { readonly kind: "STAFF"; readonly role: StaffRole };

const staffCapabilities: Readonly<Record<StaffRole, ReadonlySet<Capability>>> = {
  WAITER: new Set([
    "view_orders",
    "create_staff_order",
    "advance_order",
    "manage_waiter_calls",
  ]),
  COOK: new Set(["view_orders", "advance_order"]),
  CHEF: new Set(["view_orders", "advance_order"]),
};

export function can(access: RestaurantAccess, capability: Capability): boolean {
  if (access.kind === "OWNER") {
    return true;
  }

  return staffCapabilities[access.role].has(capability);
}


export type StaffRole = "WAITER" | "COOK" | "CHEF";

export type ActorType = "OWNER" | "STAFF" | "CUSTOMER";

export type ActorContext = {
  readonly id: string;
  readonly type: ActorType;
  readonly restaurantId?: string;
  readonly role?: StaffRole;
};

export type Capability =
  | "manage_menu"
  | "view_orders"
  | "create_staff_order"
  | "advance_order"
  | "manage_waiter_calls"
  | "manage_staff";

const ownerCapabilities: ReadonlySet<Capability> = new Set([
  "manage_menu",
  "view_orders",
  "create_staff_order",
  "advance_order",
  "manage_waiter_calls",
  "manage_staff",
]);

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

export function actorCan(
  actor: ActorContext,
  capability: Capability,
): boolean {
  if (actor.type === "OWNER") {
    return ownerCapabilities.has(capability);
  }

  if (actor.type !== "STAFF" || !actor.role) {
    return false;
  }

  return staffCapabilities[actor.role].has(capability);
}


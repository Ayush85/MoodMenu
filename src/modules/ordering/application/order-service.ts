import { actorCan, type ActorContext } from "../../shared/application/actor";
import type { Clock } from "../../shared/application/ports";
import { DomainError } from "../../shared/domain/errors";
import type { MenuCatalog } from "../../menu-management/ports/menu-catalog";
import { Order, type OrderStatus } from "../domain/order";
import { isTerminalOrderStatus, type OrderCapability } from "../domain/order-status";
import type { OrderRepository } from "../ports/order-repository";
import type { TableService } from "../../table-service/ports/table-service";

export type OrderItemRequest = { itemId: string; quantity: number };

type CreateOrderInput = {
  restaurantId: string;
  tableId: string;
  items: OrderItemRequest[];
  note?: string | null;
  customerRequestId?: string | null;
};

export type OrderNotificationIntent = {
  kind: "ORDER_STATUS_CHANGED" | "ORDER_CREATED";
  restaurantId: string;
  orderId: string;
  status: OrderStatus;
};

export class OrderService {
  private readonly clock: Clock;

  constructor(private readonly dependencies: {
    menuCatalog: MenuCatalog;
    tableService: TableService;
    orderRepository: OrderRepository;
    clock: Clock;
  }) {
    this.clock = dependencies.clock;
  }

  async createStaffOrder(
    actor: ActorContext,
    input: CreateOrderInput,
  ): Promise<{ order: Order; duplicate: false; notification: OrderNotificationIntent }> {
    this.assertActor(actor, input.restaurantId, "create_staff_order");
    return this.createOrder(input, false);
  }

  async createCustomerOrder(
    actor: ActorContext,
    input: CreateOrderInput & { customerRequestId: string },
  ): Promise<{ order: Order; duplicate: boolean; notification: OrderNotificationIntent }> {
    if (actor.type !== "CUSTOMER") {
      throw new DomainError("FORBIDDEN", "Only a table customer can create this order");
    }
    this.assertRestaurantScope(actor, input.restaurantId);
    if (!input.customerRequestId) {
      throw new DomainError("VALIDATION_FAILED", "Order request key is required", { field: "customerRequestId" });
    }

    const existing = await this.dependencies.orderRepository.findByCustomerRequestId(
      input.restaurantId,
      input.customerRequestId,
    );
    if (existing) {
      if (existing.tableId !== input.tableId) {
        throw new DomainError("CONFLICT", "This order request key has already been used");
      }
      return {
        order: existing,
        duplicate: true,
        notification: this.notification("ORDER_CREATED", existing),
      };
    }

    return this.createOrder(input, true);
  }

  async changeStatus(
    actor: ActorContext,
    input: { restaurantId: string; orderId: string; status: OrderStatus },
  ): Promise<{ order: Order; notification: OrderNotificationIntent }> {
    const capability = this.orderCapability(actor, input.restaurantId);
    const order = await this.dependencies.orderRepository.findById(
      input.restaurantId,
      input.orderId,
    );
    if (!order) throw new DomainError("NOT_FOUND", "Order not found");

    const updated = order.advanceTo(input.status, capability, this.clock);
    const saved = await this.dependencies.orderRepository.save(updated);
    if (isTerminalOrderStatus(saved.status)) {
      await this.dependencies.tableService.closeIfAllOrdersTerminal(
        saved.sessionId,
        this.clock.now(),
      );
    }

    return {
      order: saved,
      notification: this.notification("ORDER_STATUS_CHANGED", saved),
    };
  }

  private async createOrder(
    input: CreateOrderInput,
    customerOrder: boolean,
  ): Promise<{ order: Order; duplicate: false; notification: OrderNotificationIntent }> {
    const table = await this.dependencies.tableService.findTable(input.restaurantId, input.tableId);
    if (!table) throw new DomainError("NOT_FOUND", "Table not found");
    const quantities = this.normalizeItems(input.items);
    const snapshots = await this.dependencies.menuCatalog.getAvailableItemSnapshots(
      input.restaurantId,
      Array.from(quantities.keys()),
    );
    if (snapshots.length !== quantities.size) {
      throw new DomainError("CONFLICT", "One or more items are unavailable");
    }

    const byId = new Map(snapshots.map((snapshot) => [snapshot.itemId, snapshot]));
    const session = await this.dependencies.tableService.getOrStartActiveSession(
      input.restaurantId,
      input.tableId,
    );
    const order = Order.create({
      restaurantId: input.restaurantId,
      tableId: input.tableId,
      sessionId: session.id,
      lines: Array.from(quantities, ([itemId, quantity]) => ({
        snapshot: byId.get(itemId)!,
        quantity,
      })),
      note: input.note,
      createdAt: this.clock.now(),
      customerRequestId: customerOrder ? input.customerRequestId : null,
    });
    const saved = await this.dependencies.orderRepository.create(
      Order.fromPersistence({
        ...order,
        table,
      }),
    );
    return {
      order: saved,
      duplicate: false,
      notification: this.notification("ORDER_CREATED", saved),
    };
  }

  private normalizeItems(items: OrderItemRequest[]): Map<string, number> {
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      throw new DomainError("VALIDATION_FAILED", "Add between 1 and 50 menu items", { field: "items" });
    }
    const quantities = new Map<string, number>();
    for (const item of items) {
      if (!item.itemId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
        throw new DomainError("VALIDATION_FAILED", "Each item quantity must be between 1 and 20");
      }
      const nextQuantity = (quantities.get(item.itemId) ?? 0) + item.quantity;
      if (nextQuantity > 20) {
        throw new DomainError("VALIDATION_FAILED", "You can order up to 20 of each item");
      }
      quantities.set(item.itemId, nextQuantity);
    }
    return quantities;
  }

  private assertActor(actor: ActorContext, restaurantId: string, capability: "create_staff_order") {
    this.assertRestaurantScope(actor, restaurantId);
    if (!actorCan(actor, capability)) {
      throw new DomainError("FORBIDDEN", "You cannot create staff orders");
    }
  }

  private assertRestaurantScope(actor: ActorContext, restaurantId: string) {
    if (actor.restaurantId !== restaurantId) {
      throw new DomainError("NOT_FOUND", "Restaurant not found");
    }
  }

  private orderCapability(actor: ActorContext, restaurantId: string): OrderCapability {
    this.assertRestaurantScope(actor, restaurantId);
    if (actor.type === "OWNER") return "OWNER";
    if (actor.type === "STAFF" && actor.role === "WAITER") return "WAITER";
    if (actor.type === "STAFF" && (actor.role === "COOK" || actor.role === "CHEF")) return "KITCHEN";
    throw new DomainError("FORBIDDEN", "You cannot change order status");
  }

  private notification(
    kind: OrderNotificationIntent["kind"],
    order: Order,
  ): OrderNotificationIntent {
    return {
      kind,
      restaurantId: order.restaurantId,
      orderId: order.id ?? "",
      status: order.status,
    };
  }
}


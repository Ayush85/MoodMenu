import assert from "node:assert/strict";
import test from "node:test";

import type { ActorContext } from "../../shared/application/actor";
import { DomainError } from "../../shared/domain/errors";
import type { MenuCatalog } from "../../menu-management/ports/menu-catalog";
import type { TableService } from "../../table-service/ports/table-service";
import { TableSession } from "../../table-service/domain/table-session";
import type { OrderRepository } from "../ports/order-repository";
import type { Order } from "../domain/order";
import { OrderService, type CustomerOrderActor } from "./order-service";

const owner: ActorContext = {
  id: "owner-1",
  type: "OWNER",
  restaurantId: "restaurant-1",
};
const customer: CustomerOrderActor = {
  id: "table-token-1",
  type: "CUSTOMER",
  restaurantId: "restaurant-1",
  tableId: "table-1",
};
const snapshots = [
  { itemId: "item-1", itemName: "Momo", unitPrice: 180 },
  { itemId: "item-2", itemName: "Tea", unitPrice: 80 },
];

class FakeMenuCatalog implements MenuCatalog {
  async getAvailableItemSnapshots(_restaurantId: string, itemIds: string[]) {
    return snapshots.filter((snapshot) => itemIds.includes(snapshot.itemId));
  }
}

class FakeTableService implements TableService {
  readonly sessions = new Map<string, TableSession>();
  closeCalls = 0;

  async findTable(restaurantId: string, tableId: string) {
    return restaurantId === "restaurant-1" && tableId === "table-1"
      ? { id: tableId, restaurantId, number: 1, label: "Table 1" }
      : null;
  }

  async getOrStartActiveSession(restaurantId: string, tableId: string) {
    const key = `${restaurantId}:${tableId}`;
    const existing = this.sessions.get(key);
    if (existing) return existing;
    const session = TableSession.create({
      id: `session-${this.sessions.size + 1}`,
      restaurantId,
      tableId,
      startedAt: new Date("2026-09-27T12:00:00.000Z"),
    });
    this.sessions.set(key, session);
    return session;
  }

  async closeIfAllOrdersTerminal() {
    this.closeCalls += 1;
  }

  async listSessions() {
    return [];
  }

  async closeSession() {
    return undefined;
  }
}

class FakeOrderRepository implements OrderRepository {
  readonly orders: Order[] = [];

  async create(order: Order) {
    const saved = order.withId(`order-${this.orders.length + 1}`);
    this.orders.push(saved);
    return saved;
  }

  async findById(restaurantId: string, orderId: string) {
    return this.orders.find((order) => order.restaurantId === restaurantId && order.id === orderId) ?? null;
  }

  async findByCustomerRequestId(restaurantId: string, customerRequestId: string) {
    return this.orders.find(
      (order) => order.restaurantId === restaurantId && order.customerRequestId === customerRequestId,
    ) ?? null;
  }

  async listByRestaurant(restaurantId: string) {
    return this.orders.filter((order) => order.restaurantId === restaurantId);
  }

  async countRecentNonCanceled() {
    return 0;
  }

  async save(order: Order) {
    const index = this.orders.findIndex((existing) => existing.id === order.id);
    this.orders[index] = order;
    return order;
  }
}

function service() {
  const tableService = new FakeTableService();
  const orderRepository = new FakeOrderRepository();
  return {
    service: new OrderService({
      menuCatalog: new FakeMenuCatalog(),
      tableService,
      orderRepository,
      clock: { now: () => new Date("2026-09-27T12:00:00.000Z") },
    }),
    orderRepository,
  };
}

test("staff order creation snapshots menu name and price", async () => {
  const { service: orderService, orderRepository } = service();
  const result = await orderService.createStaffOrder(owner, {
    restaurantId: "restaurant-1",
    tableId: "table-1",
    items: [{ itemId: "item-1", quantity: 2 }],
  });

  assert.equal(result.order.total, 360);
  assert.equal(result.order.lines[0].itemName, "Momo");
  assert.equal(orderRepository.orders.length, 1);
});

test("customer order creation rejects unavailable items and de-duplicates retries", async () => {
  const { service: orderService } = service();
  await assert.rejects(
    orderService.createCustomerOrder(customer, {
      restaurantId: "restaurant-1",
      tableId: "table-1",
      items: [{ itemId: "item-missing", quantity: 1 }],
      customerRequestId: "request-missing",
    }),
    (error: unknown) => error instanceof DomainError && error.code === "CONFLICT",
  );

  const first = await orderService.createCustomerOrder(customer, {
    restaurantId: "restaurant-1",
    tableId: "table-1",
    items: [{ itemId: "item-2", quantity: 1 }],
    customerRequestId: "request-1",
  });
  const retry = await orderService.createCustomerOrder(customer, {
    restaurantId: "restaurant-1",
    tableId: "table-1",
    items: [{ itemId: "item-2", quantity: 1 }],
    customerRequestId: "request-1",
  });

  assert.equal(first.order.id, retry.order.id);
  assert.equal(retry.duplicate, true);
});

test("status changes persist and return notification intent without requiring push delivery", async () => {
  const { service: orderService } = service();
  const created = await orderService.createStaffOrder(owner, {
    restaurantId: "restaurant-1",
    tableId: "table-1",
    items: [{ itemId: "item-1", quantity: 1 }],
  });

  const changed = await orderService.changeStatus(owner, {
    restaurantId: "restaurant-1",
    orderId: created.order.id!,
    status: "PREPARING",
  });

  assert.equal(changed.order.status, "PREPARING");
  assert.equal(changed.notification.orderId, created.order.id);
});

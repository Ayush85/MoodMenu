import type { Order } from "../domain/order";

export interface OrderRepository {
  create(order: Order): Promise<Order>;
  findById(restaurantId: string, orderId: string): Promise<Order | null>;
  findByCustomerRequestId(
    restaurantId: string,
    customerRequestId: string,
  ): Promise<Order | null>;
  listByRestaurant(restaurantId: string): Promise<Order[]>;
  countRecentNonCanceled(tableId: string, since: Date): Promise<number>;
  save(order: Order): Promise<Order>;
}


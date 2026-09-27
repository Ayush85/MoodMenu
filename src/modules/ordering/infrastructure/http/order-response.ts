import type { Order } from "../../domain/order";

export function orderResponse(order: Order) {
  return {
    id: order.id,
    restaurantId: order.restaurantId,
    tableId: order.tableId,
    sessionId: order.sessionId || null,
    customerRequestId: order.customerRequestId ?? null,
    status: order.status,
    note: order.note,
    total: order.total,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    table: order.table,
    items: order.lines.map((line) => ({
      id: line.itemId,
      itemName: line.itemName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
    })),
  };
}


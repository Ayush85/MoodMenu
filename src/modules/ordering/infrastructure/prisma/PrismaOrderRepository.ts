import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { DomainError } from "@/modules/shared/domain/errors";
import { Order, type OrderProps, type OrderTable } from "../../domain/order";
import type { OrderRepository } from "../../ports/order-repository";

type OrderRecord = {
  id: string;
  restaurantId: string;
  tableId: string;
  sessionId: string | null;
  status: string;
  note: string | null;
  total: number;
  createdAt: Date;
  updatedAt: Date;
  customerRequestId: string | null;
  table: { id: string; number: number; label: string | null };
  items: Array<{
    id: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

export class PrismaOrderRepository implements OrderRepository {
  async create(order: Order): Promise<Order> {
    try {
      const created = await prisma.$transaction(async (tx) => {
      let session = await tx.tableSession.findFirst({
        where: { id: order.sessionId, restaurantId: order.restaurantId, tableId: order.tableId },
      });
      if (!session) {
        session = await tx.tableSession.create({
          data: {
            id: order.sessionId,
            restaurantId: order.restaurantId,
            tableId: order.tableId,
          },
        });
      }

      const createdOrder = await tx.orderTicket.create({
        data: {
          restaurantId: order.restaurantId,
          tableId: order.tableId,
          sessionId: session.id,
          customerRequestId: order.customerRequestId ?? null,
          note: order.note,
          total: order.total,
          createdAt: order.createdAt,
          items: {
            create: order.lines.map((line) => ({
              itemName: line.itemName,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.lineTotal,
            })),
          },
        },
        include: { table: true, items: true },
      });

      await tx.tableSession.update({
        where: { id: session.id },
        data: {
          totalAmount: { increment: order.total },
          lastActivityAt: order.createdAt,
        },
      });

        return createdOrder;
      });

      return this.map({
        ...created,
        sessionId: order.sessionId,
        customerRequestId: order.customerRequestId ?? null,
      });
    } catch (error) {
      if (
        order.customerRequestId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await prisma.orderTicket.findUnique({
          where: { customerRequestId: order.customerRequestId },
          include: { table: true, items: true },
        });
        if (existing) return this.map(existing);
        throw new DomainError("CONFLICT", "This order request key has already been used");
      }
      throw error;
    }
  }

  async findById(restaurantId: string, orderId: string): Promise<Order | null> {
    const order = await prisma.orderTicket.findFirst({
      where: { id: orderId, restaurantId },
      include: { table: true, items: true },
    });
    return order ? this.map(order) : null;
  }

  async findByCustomerRequestId(
    restaurantId: string,
    customerRequestId: string,
  ): Promise<Order | null> {
    const order = await prisma.orderTicket.findFirst({
      where: { restaurantId, customerRequestId },
      include: { table: true, items: true },
    });
    return order ? this.map(order) : null;
  }

  async listByRestaurant(restaurantId: string): Promise<Order[]> {
    const orders = await prisma.orderTicket.findMany({
      where: { restaurantId },
      include: { table: true, items: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return orders.map((order) => this.map(order));
  }

  async countRecentNonCanceled(tableId: string, since: Date): Promise<number> {
    return prisma.orderTicket.count({
      where: {
        tableId,
        status: { not: "CANCELED" },
        createdAt: { gte: since },
      },
    });
  }

  async save(order: Order): Promise<Order> {
    const existing = await this.findById(order.restaurantId, order.id ?? "");
    if (!existing) throw new DomainError("NOT_FOUND", "Order not found");

    const updated = await prisma.orderTicket.update({
      where: { id: order.id },
      data: { status: order.status },
      include: { table: true, items: true },
    });
    return this.map(updated);
  }

  private map(record: OrderRecord): Order {
    const table: OrderTable = {
      id: record.table.id,
      number: record.table.number,
      label: record.table.label,
    };
    const props: OrderProps = {
      id: record.id,
      restaurantId: record.restaurantId,
      tableId: record.tableId,
      sessionId: record.sessionId ?? "",
      status: record.status as OrderProps["status"],
      note: record.note,
      lines: record.items.map((item) => ({
        itemId: item.id,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      total: record.total,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      customerRequestId: record.customerRequestId,
      table,
    };
    return Order.fromPersistence(props);
  }
}

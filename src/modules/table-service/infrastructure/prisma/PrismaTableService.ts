import { prisma } from "@/lib/db";
import { DomainError } from "@/modules/shared/domain/errors";
import { TableSession } from "../../domain/table-session";
import type {
  TableReference,
  TableService,
  TableSessionReadModel,
} from "../../ports/table-service";

function notFound(message: string): DomainError {
  return new DomainError("NOT_FOUND", message);
}

export class PrismaTableService implements TableService {
  async findTable(restaurantId: string, tableId: string): Promise<TableReference | null> {
    const table = await prisma.restaurantTable.findFirst({
      where: { id: tableId, restaurantId },
      select: { id: true, restaurantId: true, number: true, label: true },
    });
    return table;
  }

  async getOrStartActiveSession(
    restaurantId: string,
    tableId: string,
  ): Promise<TableSession> {
    const table = await this.findTable(restaurantId, tableId);
    if (!table) throw notFound("Table not found");

    const existing = await prisma.tableSession.findFirst({
      where: { restaurantId, tableId, status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
    });
    if (existing) return this.mapSession(existing);

    const created = await prisma.tableSession.create({
      data: { restaurantId, tableId },
    });
    return this.mapSession(created);
  }

  async closeIfAllOrdersTerminal(sessionId: string, now: Date): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const session = await tx.tableSession.findUnique({
        where: { id: sessionId },
        select: { id: true, status: true },
      });
      if (!session || session.status === "CLOSED") return;

      const activeOrder = await tx.orderTicket.findFirst({
        where: {
          sessionId,
          status: { notIn: ["PAID", "CANCELED"] },
        },
        select: { id: true },
      });
      if (!activeOrder) {
        await tx.tableSession.update({
          where: { id: sessionId },
          data: { status: "CLOSED", endedAt: now, lastActivityAt: now },
        });
      }
    });
  }

  async listSessions(
    restaurantId: string,
    status: "ACTIVE" | "CLOSED",
  ): Promise<TableSessionReadModel[]> {
    const sessions = await prisma.tableSession.findMany({
      where: { restaurantId, status },
      include: {
        table: { select: { number: true, label: true } },
        orders: {
          orderBy: { createdAt: "asc" },
          include: { items: true },
        },
      },
      orderBy: { startedAt: "desc" },
      take: 50,
    });

    return sessions.map((session) => ({
      id: session.id,
      restaurantId: session.restaurantId,
      tableId: session.tableId,
      status: session.status,
      totalAmount: session.totalAmount,
      startedAt: session.startedAt,
      lastActivityAt: session.lastActivityAt,
      endedAt: session.endedAt,
      table: session.table,
      orders: session.orders.map((order) => ({
        id: order.id,
        status: order.status,
        note: order.note,
        total: order.total,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items.map((item) => ({
          id: item.id,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      })),
    }));
  }

  async closeSession(restaurantId: string, sessionId: string, now: Date): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const session = await tx.tableSession.findFirst({
        where: { id: sessionId, restaurantId },
        select: { id: true },
      });
      if (!session) throw notFound("Session not found");

      await tx.orderTicket.updateMany({
        where: { sessionId, status: { notIn: ["CANCELED", "PAID"] } },
        data: { status: "PAID" },
      });
      await tx.tableSession.update({
        where: { id: sessionId },
        data: { status: "CLOSED", endedAt: now, lastActivityAt: now },
      });
    });
  }

  private mapSession(session: {
    id: string;
    restaurantId: string;
    tableId: string;
    status: "ACTIVE" | "CLOSED";
    totalAmount: number;
    startedAt: Date;
    lastActivityAt: Date;
    endedAt: Date | null;
  }): TableSession {
    return TableSession.fromPersistence(session);
  }
}


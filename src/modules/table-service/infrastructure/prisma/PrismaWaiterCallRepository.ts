import { prisma } from "@/lib/db";
import { DomainError } from "@/modules/shared/domain/errors";
import {
  WaiterCall,
  type WaiterCallProps,
  type WaiterCallStatus,
} from "../../domain/waiter-call";
import type { WaiterCallRepository } from "../../ports/table-service";

export class PrismaWaiterCallRepository implements WaiterCallRepository {
  async hasRecentPending(tableId: string, since: Date): Promise<boolean> {
    const call = await prisma.waiterCall.findFirst({
      where: { tableId, status: "PENDING", createdAt: { gte: since } },
      select: { id: true },
    });
    return Boolean(call);
  }

  async create(call: WaiterCall): Promise<WaiterCall> {
    const created = await prisma.waiterCall.create({
      data: {
        id: call.id,
        restaurantId: call.restaurantId,
        tableId: call.tableId,
        message: call.message,
        createdAt: call.createdAt,
      },
      include: { table: { select: { number: true, label: true } } },
    });
    return this.map(created);
  }

  async findById(restaurantId: string, callId: string): Promise<WaiterCall | null> {
    const call = await prisma.waiterCall.findFirst({
      where: { id: callId, restaurantId },
      include: { table: { select: { number: true, label: true } } },
    });
    return call ? this.map(call) : null;
  }

  async listByRestaurant(restaurantId: string): Promise<WaiterCall[]> {
    const calls = await prisma.waiterCall.findMany({
      where: { restaurantId },
      include: { table: { select: { number: true, label: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return calls.map((call) => this.map(call));
  }

  async save(call: WaiterCall): Promise<WaiterCall> {
    const existing = await this.findById(call.restaurantId, call.id);
    if (!existing) throw new DomainError("NOT_FOUND", "Waiter call not found");

    const updated = await prisma.waiterCall.update({
      where: { id: call.id },
      data: {
        status: call.status,
        handledBy: call.handledBy,
        acknowledgedAt: call.acknowledgedAt ?? undefined,
        resolvedAt: call.resolvedAt ?? undefined,
      },
      include: { table: { select: { number: true, label: true } } },
    });
    return this.map(updated);
  }

  private map(record: {
    id: string;
    restaurantId: string;
    tableId: string;
    message: string | null;
    status: string;
    createdAt: Date;
    acknowledgedAt: Date | null;
    resolvedAt: Date | null;
    handledBy: string | null;
    table: { number: number; label: string | null };
  }): WaiterCall {
    const props: WaiterCallProps = {
      id: record.id,
      restaurantId: record.restaurantId,
      tableId: record.tableId,
      message: record.message,
      status: record.status as WaiterCallStatus,
      createdAt: record.createdAt,
      acknowledgedAt: record.acknowledgedAt,
      resolvedAt: record.resolvedAt,
      handledBy: record.handledBy,
      table: record.table,
    };
    return WaiterCall.fromPersistence(props);
  }
}


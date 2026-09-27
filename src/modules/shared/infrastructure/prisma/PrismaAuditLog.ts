import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { AuditEvent, AuditLogPort } from "../../application/ports";
import { DomainError } from "../../domain/errors";

type AuditEventClient = {
  auditEvent: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
};

const SENSITIVE_KEY = /(token|password|secret|authorization|cookie|credential|key)/iu;

function sanitizeMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => sanitizeMetadata(entry) ?? null);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SENSITIVE_KEY.test(key))
        .map(([key, nested]) => [key, sanitizeMetadata(nested)] as const)
        .filter(([, nested]) => nested !== undefined),
    );
  }
  if (
    value === null ||
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return undefined;
}

export class PrismaAuditLog implements AuditLogPort {
  constructor(private readonly client: AuditEventClient = prisma) {}

  async record(event: AuditEvent): Promise<void> {
    try {
      const data: Record<string, unknown> = {
        action: event.action,
        entityType: event.entityType,
        occurredAt: event.occurredAt,
      };

      if (event.restaurantId) data.restaurantId = event.restaurantId;
      if (event.actorId) data.actorId = event.actorId;
      if (event.actorType) data.actorType = event.actorType;
      if (event.entityId) data.entityId = event.entityId;
      if (event.metadata !== undefined) data.metadata = sanitizeMetadata(event.metadata);

      await this.client.auditEvent.create({ data });
    } catch (error) {
      logger.error("audit.event_write_failed", {
        restaurantId: event.restaurantId,
        actorType: event.actorType,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        error,
      });
      throw new DomainError(
        "DEPENDENCY_UNAVAILABLE",
        "Audit logging is temporarily unavailable",
      );
    }
  }
}

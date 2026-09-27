export type AuditEvent = {
  readonly restaurantId?: string;
  readonly actorId?: string;
  readonly actorType?: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly occurredAt: Date;
};

export interface Clock {
  now(): Date;
}

export interface AuditLogPort {
  record(event: AuditEvent): Promise<void>;
}


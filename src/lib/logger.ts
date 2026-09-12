// Structured JSON logger. Writes one JSON object per line to stdout/stderr
// so Docker's log driver (and anything reading `docker logs`) can be
// filtered/parsed without a separate logging service.

type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  restaurantId?: string;
  userId?: string;
  [key: string]: unknown;
}

function serialize(level: LogLevel, message: string, context?: LogContext) {
  return JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...context,
  });
}

function write(level: LogLevel, message: string, context?: LogContext) {
  const line = serialize(level, message, context);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext & { error?: unknown }) => {
    const { error, ...rest } = context ?? {};
    const errorFields =
      error instanceof Error
        ? { errorMessage: error.message, errorName: error.name, stack: error.stack }
        : error !== undefined
          ? { error }
          : {};
    write("error", message, { ...rest, ...errorFields });
  },
};

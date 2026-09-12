import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { logger } from "./logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (req: NextRequest, ...rest: any[]) => Promise<Response> | Response;

// Wraps a Next.js route handler so every request/response (and any
// exception the handler doesn't catch) is logged with a request id, and an
// uncaught error returns a clean 500 instead of crashing the route or
// leaking a stack trace to the client. This is the "fault tolerance" layer
// for API routes — apply it to every exported GET/POST/PATCH/PUT/DELETE.
export function withApiLogging<H extends AnyHandler>(handler: H): H {
  const wrapped = async (req: NextRequest, ...rest: unknown[]) => {
    const requestId = randomUUID();
    const start = Date.now();
    const route = new URL(req.url).pathname;

    logger.info("api.request.start", { requestId, method: req.method, route });

    try {
      const res = (await handler(req, ...rest)) as Response;
      res.headers.set("x-request-id", requestId);
      logger.info("api.request.end", {
        requestId,
        method: req.method,
        route,
        status: res.status,
        durationMs: Date.now() - start,
      });
      return res;
    } catch (error) {
      logger.error("api.request.error", {
        requestId,
        method: req.method,
        route,
        durationMs: Date.now() - start,
        error,
      });
      return NextResponse.json(
        { error: "Internal server error", requestId },
        { status: 500, headers: { "x-request-id": requestId } }
      );
    }
  };

  return wrapped as H;
}

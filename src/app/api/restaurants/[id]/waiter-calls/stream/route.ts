import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type AccessInfo =
  | { kind: "OWNER" }
  | { kind: "STAFF"; role: "WAITER" | "COOK" | "CHEF" };

async function getRestaurantAccess(restaurantId: string, sessionUser: { id: string; actorType?: "USER" | "STAFF" }): Promise<AccessInfo | null> {
  if (sessionUser.actorType === "STAFF") {
    const staffRecord = await prisma.restaurantStaff.findFirst({
      where: { id: sessionUser.id, restaurantId, isActive: true },
      select: { id: true, role: true },
    });
    if (!staffRecord) return null;
    return { kind: "STAFF", role: staffRecord.role as "WAITER" | "COOK" | "CHEF" };
  }

  const ownerRecord = await prisma.restaurant.findFirst({
    where: { id: restaurantId, ownerId: sessionUser.id },
    select: { id: true },
  });
  if (!ownerRecord) return null;
  return { kind: "OWNER" };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const access = await getRestaurantAccess(id, {
    id: session.user.id,
    actorType: session.user.actorType,
  });
  if (!access) {
    return new Response("Not found", { status: 404 });
  }
  if (access.kind === "STAFF" && access.role !== "WAITER") {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        if (!closed) {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      };

      // Poll every 3 seconds for new pending calls
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }

        try {
          const pendingCalls = await prisma.waiterCall.findMany({
            where: {
              restaurantId: id,
              status: "PENDING",
            },
            include: { table: true },
            orderBy: { createdAt: "desc" },
          });

          send(JSON.stringify({
            type: "calls",
            calls: pendingCalls.map((c) => ({
              id: c.id,
              tableNumber: c.table.number,
              tableLabel: c.table.label,
              message: c.message,
              status: c.status,
              createdAt: c.createdAt,
            })),
          }));
        } catch {
          // DB error, skip this tick
        }
      }, 3000);

      // Send initial heartbeat
      send(JSON.stringify({ type: "connected" }));

      // Cleanup on close
      _req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

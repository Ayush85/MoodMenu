import { NextRequest, NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api-handler";
import { domainErrorToHttp } from "@/modules/shared/application/domain-error-http";
import { createPrismaOrderService } from "@/modules/ordering/infrastructure/prisma/create-order-service";
import { orderResponse } from "@/modules/ordering/infrastructure/http/order-response";
import { createCustomerTableActorService } from "@/modules/table-service/infrastructure/http/create-customer-table-actor-service";

const orderService = createPrismaOrderService();
const customerTableActorService = createCustomerTableActorService();

export const GET = withApiLogging(async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; orderId: string }> },
) {
  const { slug, orderId } = await params;
  const tableNumber = req.nextUrl.searchParams.get("table");
  const tableToken = req.nextUrl.searchParams.get("t");

  try {
    const actor = await customerTableActorService.resolve({
      slug,
      tableNumber,
      tableToken,
    });
    const order = await orderService.getCustomerOrder(actor, actor.restaurantId, orderId);
    const response = orderResponse(order);
    return NextResponse.json({
      id: response.id,
      status: response.status,
      note: response.note,
      total: response.total,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
      items: response.items,
    });
  } catch (error) {
    const mapped = domainErrorToHttp(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
});

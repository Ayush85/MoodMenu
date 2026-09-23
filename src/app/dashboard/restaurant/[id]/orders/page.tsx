"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import OrderBoard from "@/components/dashboard/orders/OrderBoard";
import type { StaffRole } from "@/components/dashboard/orders/types";

export default function OrdersPage() {
  const params = useParams();
  const { data: session } = useSession();
  const restaurantId = params.id as string;
  const actorType = session?.user?.actorType;
  const staffRole = actorType === "STAFF" ? (session?.user?.role as StaffRole | undefined) : undefined;
  const canTakeOrders = actorType === "USER" || staffRole === "WAITER";
  const canUseCalls = actorType === "USER" || staffRole === "WAITER";

  return (
    <div className="page-shell space-y-4 sm:space-y-5">
      <header className="surface-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="page-title">Orders</h1>
            <p className="page-subtitle mt-1">Live order flow for the kitchen and front of house</p>
          </div>
          <span className="w-fit rounded-full bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white">
            {actorType === "USER" ? "Admin" : (staffRole || "Staff")}
          </span>
        </div>
      </header>

      <OrderBoard
        restaurantId={restaurantId}
        actorType={actorType}
        staffRole={staffRole}
        canTakeOrders={canTakeOrders}
        canUseCalls={canUseCalls}
      />
    </div>
  );
}

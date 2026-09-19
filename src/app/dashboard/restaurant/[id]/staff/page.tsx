"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import StaffManagement from "@/components/dashboard/staff/StaffManagement";

export default function StaffPage() {
  const params = useParams();
  const { data: session } = useSession();

  return (
    <StaffManagement
      restaurantId={params.id as string}
      canManageStaff={session?.user?.actorType === "USER"}
    />
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Sidebar from "@/components/dashboard/Sidebar";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <>
      <link rel="manifest" href="/dashboard/manifest.webmanifest" />
    <div className="min-h-screen md:flex" style={{ background: "linear-gradient(135deg, #f8fafc, #f1f5f9)" }}>
      <Sidebar />
      <main className="flex-1 overflow-x-hidden p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-8">{children}</main>
    </div>
    </>
  );
}

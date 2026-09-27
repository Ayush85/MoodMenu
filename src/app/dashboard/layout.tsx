import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Sidebar from "@/components/dashboard/Sidebar";
import FcmInit from "@/components/FcmInit";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  manifest: "/dashboard/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Menuor",
    statusBarStyle: "default",
  },
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
    <div className="min-h-screen md:flex" style={{ background: "linear-gradient(135deg, #f8fafc, #f1f5f9)" }}>
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8 lg:p-8">{children}</main>
      <FcmInit />
      <PwaInstallPrompt />
    </div>
  );
}

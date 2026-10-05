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
    <div className="min-h-screen bg-(--page-bg) md:flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-gray-900 focus:shadow-lg"
      >
        Skip to content
      </a>
      <Sidebar />
      <main id="main-content" tabIndex={-1} className="min-w-0 outline-none flex-1 overflow-x-hidden p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8 lg:p-8">{children}</main>
      <FcmInit />
      <PwaInstallPrompt />
    </div>
  );
}

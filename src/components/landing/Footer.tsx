import Link from "next/link";
import Logo from "@/components/ui/Logo";

export default function Footer() {
  return (
    <footer className="border-t border-black/[0.04] bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Logo size={24} />
        <p className="text-sm text-gray-400">Smart digital menus for restaurants in Nepal</p>
        <div className="flex gap-6 text-sm text-gray-400">
          <Link href="/login" className="hover:text-gray-600 transition">
            Sign In
          </Link>
          <Link href="/register" className="hover:text-gray-600 transition">
            Sign Up
          </Link>
        </div>
      </div>
    </footer>
  );
}

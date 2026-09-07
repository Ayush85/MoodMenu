import Link from "next/link";
import Logo from "@/components/ui/Logo";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="group">
          <span className="inline-block transition-transform group-hover:scale-105">
            <Logo size={32} />
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2 text-sm transition rounded-lg hover:bg-black/[0.03]"
          >
            Sign In
          </Link>
          <Link href="/register" className="btn-primary !text-sm !px-5 !py-2">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

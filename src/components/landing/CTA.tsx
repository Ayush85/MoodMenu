import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTA() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
      <div
        className="relative overflow-hidden rounded-3xl animate-gradient p-12 sm:p-16 text-center text-white"
        style={{
          background: "linear-gradient(135deg, #f97316, #ec4899, #8b5cf6, #f97316)",
          backgroundSize: "400% 400%",
        }}
      >
        {/* Floating circles decoration */}
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/4" />

        <div className="relative">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to give your menu a mood?</h2>
          <p className="text-lg opacity-90 mb-8 max-w-lg mx-auto">
            Free to start. Set up in under 5 minutes. No credit card required.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-gray-900 font-bold px-8 py-4 rounded-2xl text-lg transition hover:bg-gray-50 hover:shadow-xl hover:shadow-white/20 hover:-translate-y-0.5"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

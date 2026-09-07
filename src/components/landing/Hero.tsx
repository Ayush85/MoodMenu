import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Animated gradient bg */}
      <div
        className="absolute inset-0 animate-gradient opacity-30"
        style={{
          background: "linear-gradient(135deg, #fed7aa, #fecdd3, #ddd6fe, #bfdbfe, #fed7aa)",
          backgroundSize: "400% 400%",
        }}
      />
      {/* Floating shapes */}
      <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-orange-400/20 blur-3xl animate-float" />
      <div
        className="absolute bottom-10 right-[10%] w-96 h-96 rounded-full bg-violet-400/20 blur-3xl animate-float"
        style={{ animationDelay: "3s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-rose-300/10 blur-3xl animate-float"
        style={{ animationDelay: "1.5s" }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-20 sm:pb-32 text-center">
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-black/[0.06] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Emotional Engineering for Local Cafes
          </div>
        </div>

        <h1 className="animate-fade-in-up stagger-1 text-5xl sm:text-6xl lg:text-8xl font-extrabold text-gray-900 leading-[1.05] mb-6 tracking-tight">
          Your menu has
          <br />a <span className="gradient-text">mood</span>
        </h1>

        <p className="animate-fade-in-up stagger-2 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Build beautiful digital menus that adapt to the weather and time of
          day. Rainy evening? Warm dark mode with hot momo featured. Sunny
          afternoon? Bright colors with iced drinks up top.
        </p>

        <div className="animate-fade-in-up stagger-3 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register" className="btn-primary !text-base !px-8 !py-4 !rounded-2xl">
            Create Your Menu
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/menu/ayush-test-kitchen?table=1" className="btn-soft !text-base !px-8 !py-4 !rounded-2xl">
            <PlayCircle className="w-4 h-4" />
            See Demo
          </Link>
        </div>
      </div>
    </section>
  );
}

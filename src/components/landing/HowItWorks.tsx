import { Sparkles, ChefHat, Zap, Rocket } from "lucide-react";

const STEPS = [
  { step: "1", icon: Sparkles, title: "Create", desc: "Sign up and add your restaurant with its city" },
  { step: "2", icon: ChefHat, title: "Build", desc: "Add categories, items, photos, and prices" },
  { step: "3", icon: Zap, title: "Configure", desc: "Set mood rules — what to feature when it rains, etc." },
  { step: "4", icon: Rocket, title: "Share", desc: "Get your QR code, print it, place it on tables" },
];

export default function HowItWorks() {
  return (
    <section className="bg-white border-y border-black/[0.04]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Up and running in <span className="gradient-text">minutes</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Four simple steps to launch your smart digital menu.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-orange-300 via-rose-300 to-violet-300 z-0" />

          {STEPS.map((item) => (
            <div key={item.step} className="relative text-center z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 via-rose-500 to-violet-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">{item.title}</h3>
              <p className="text-sm text-gray-500 max-w-[200px] mx-auto">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

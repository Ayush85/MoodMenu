import { QrCode, CloudSun, Palette, ClipboardList, BellRing, LineChart } from "lucide-react";

const FEATURES = [
  {
    icon: QrCode,
    color: "from-orange-500 to-rose-500",
    title: "QR Code Digital Menu",
    desc: "Get a unique QR code for your restaurant. Customers scan and instantly see your digital menu — no app download needed.",
  },
  {
    icon: ClipboardList,
    color: "from-emerald-500 to-teal-600",
    title: "Order & Table Management",
    desc: "Customers order straight from the table. Orders flow into a live kitchen board your staff can track from new to served to paid.",
  },
  {
    icon: BellRing,
    color: "from-amber-500 to-orange-600",
    title: "Waiter Call Button",
    desc: "One tap and your waiter is notified instantly — no more waving across the room to get a table's attention.",
  },
  {
    icon: LineChart,
    color: "from-sky-500 to-indigo-600",
    title: "Staff & Expense Tracking",
    desc: "Manage your team's roles and access, log expenses, and see sales analytics — the restaurant management tools you need alongside the menu.",
  },
  {
    icon: CloudSun,
    color: "from-blue-500 to-cyan-500",
    title: "Weather-Adaptive",
    desc: "Menu theme and featured items change based on real-time weather. Rain brings warm vibes, sun brings refreshing energy.",
  },
  {
    icon: Palette,
    color: "from-violet-500 to-purple-600",
    title: "Mood Rules",
    desc: "Configure how your menu adapts. Set rules for rainy days, sunny afternoons, late nights — you control the experience.",
  },
];

export default function Features() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
      <div className="text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          A complete <span className="gradient-text">restaurant management system</span>
        </h2>
        <p className="text-gray-500 max-w-xl mx-auto">
          From a digital menu customers love to the order, staff, and expense tools that run your restaurant behind the scenes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {FEATURES.map((feature, i) => (
          <div
            key={feature.title}
            className={`group surface-card p-8 hover:!shadow-xl hover:-translate-y-1 transition-all duration-300 animate-fade-in-up stagger-${(i % 3) + 1}`}
          >
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}
            >
              <feature.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
            <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

import { QrCode, CloudSun, Palette } from "lucide-react";

const FEATURES = [
  {
    icon: QrCode,
    color: "from-orange-500 to-rose-500",
    title: "QR Code Ready",
    desc: "Get a unique QR code for your restaurant. Customers scan and instantly see your menu — no app download needed.",
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
          Everything you need to <span className="gradient-text">stand out</span>
        </h2>
        <p className="text-gray-500 max-w-xl mx-auto">
          A complete toolkit to transform your paper menu into an adaptive digital experience.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {FEATURES.map((feature, i) => (
          <div
            key={feature.title}
            className={`group surface-card p-8 hover:!shadow-xl hover:-translate-y-1 transition-all duration-300 animate-fade-in-up stagger-${i + 1}`}
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

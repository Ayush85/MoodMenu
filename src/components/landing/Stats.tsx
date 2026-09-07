const STATS = [
  { value: "50+", label: "Restaurants" },
  { value: "1,200+", label: "Menu Items" },
  { value: "10+", label: "Cities" },
];

export default function Stats() {
  return (
    <section className="border-y border-black/[0.04] bg-white/60 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-3 gap-4 text-center">
        {STATS.map((stat) => (
          <div key={stat.label}>
            <p className="text-2xl sm:text-3xl font-extrabold gradient-text">{stat.value}</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

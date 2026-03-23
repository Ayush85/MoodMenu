import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 glass border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 via-rose-500 to-violet-600 flex items-center justify-center transition-transform group-hover:scale-110">
              <span className="text-white text-sm font-black">M</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Mood<span className="gradient-text">Menu</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2 text-sm transition rounded-lg hover:bg-black/[0.03]"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="btn-primary !text-sm !px-5 !py-2"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Animated gradient bg */}
        <div
          className="absolute inset-0 animate-gradient opacity-30"
          style={{
            background:
              "linear-gradient(135deg, #fed7aa, #fecdd3, #ddd6fe, #bfdbfe, #fed7aa)",
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
            <Link
              href="/register"
              className="btn-primary !text-base !px-8 !py-4 !rounded-2xl"
            >
              Create Your Menu
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
            <Link
              href="/menu/ayush-test-kitchen?table=1"
              className="btn-soft !text-base !px-8 !py-4 !rounded-2xl"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              See Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="border-y border-black/[0.04] bg-white/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-3 gap-4 text-center">
          {[
            { value: "50+", label: "Restaurants" },
            { value: "1,200+", label: "Menu Items" },
            { value: "10+", label: "Cities" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl sm:text-3xl font-extrabold gradient-text">
                {stat.value}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Everything you need to{" "}
            <span className="gradient-text">stand out</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            A complete toolkit to transform your paper menu into an adaptive
            digital experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: "📱",
              color: "from-orange-500 to-rose-500",
              title: "QR Code Ready",
              desc: "Get a unique QR code for your restaurant. Customers scan and instantly see your menu — no app download needed.",
            },
            {
              icon: "🌦️",
              color: "from-blue-500 to-cyan-500",
              title: "Weather-Adaptive",
              desc: "Menu theme and featured items change based on real-time weather. Rain brings warm vibes, sun brings refreshing energy.",
            },
            {
              icon: "🎨",
              color: "from-violet-500 to-purple-600",
              title: "Mood Rules",
              desc: "Configure how your menu adapts. Set rules for rainy days, sunny afternoons, late nights — you control the experience.",
            },
          ].map((feature, i) => (
            <div
              key={feature.title}
              className={`group surface-card p-8 hover:!shadow-xl hover:-translate-y-1 transition-all duration-300 animate-fade-in-up stagger-${i + 1}`}
            >
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform duration-300`}
              >
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
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

            {[
              {
                step: "1",
                icon: "✨",
                title: "Create",
                desc: "Sign up and add your restaurant with its city",
              },
              {
                step: "2",
                icon: "🍱",
                title: "Build",
                desc: "Add categories, items, photos, and prices",
              },
              {
                step: "3",
                icon: "⚡",
                title: "Configure",
                desc: "Set mood rules — what to feature when it rains, etc.",
              },
              {
                step: "4",
                icon: "🚀",
                title: "Share",
                desc: "Get your QR code, print it, place it on tables",
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 via-rose-500 to-violet-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg shadow-orange-500/20">
                  {item.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 max-w-[200px] mx-auto">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <div className="relative overflow-hidden rounded-3xl animate-gradient p-12 sm:p-16 text-center text-white"
          style={{
            background: "linear-gradient(135deg, #f97316, #ec4899, #8b5cf6, #f97316)",
            backgroundSize: "400% 400%",
          }}
        >
          {/* Floating circles decoration */}
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/4" />

          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to give your menu a mood?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-lg mx-auto">
              Free to start. Set up in under 5 minutes. No credit card required.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-white text-gray-900 font-bold px-8 py-4 rounded-2xl text-lg transition hover:bg-gray-50 hover:shadow-xl hover:shadow-white/20 hover:-translate-y-0.5"
            >
              Get Started Free
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-black/[0.04] bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-500 via-rose-500 to-violet-600 flex items-center justify-center">
              <span className="text-white text-[10px] font-black">M</span>
            </div>
            <span className="text-sm font-semibold text-gray-700">
              MoodMenu
            </span>
          </div>
          <p className="text-sm text-gray-400">
            Smart digital menus for restaurants in Nepal
          </p>
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
    </div>
  );
}

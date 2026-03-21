import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 via-white to-purple-50 overflow-x-hidden">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 flex items-center justify-between gap-3">
        <span className="text-xl sm:text-2xl font-bold text-gray-900 whitespace-nowrap">
          <span className="text-orange-500">Mood</span>Menu
        </span>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/login"
            className="text-gray-600 hover:text-gray-900 font-medium px-3 sm:px-4 py-2 text-sm sm:text-base transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base transition"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16 sm:pb-24 lg:pb-32 text-center">
        <div className="inline-block bg-purple-100 text-purple-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          Emotional Engineering for Local Cafes
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6">
          Your menu has a{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-500 to-purple-600">
            mood
          </span>
        </h1>
        <p className="text-base sm:text-xl text-gray-500 max-w-2xl mx-auto mb-8 sm:mb-10">
          Build beautiful digital menus that adapt to the weather and time of day.
          Rainy evening? Warm dark mode with hot momo featured.
          Sunny afternoon? Bright colors with iced drinks up top.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link
            href="/register"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl text-base sm:text-lg transition shadow-lg shadow-orange-500/25"
          >
            Create Your Menu
          </Link>
          <Link
            href="/menu/demo"
            className="bg-white hover:bg-gray-50 text-gray-900 font-semibold px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl text-base sm:text-lg transition border border-gray-200"
          >
            See Demo
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24 lg:pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              QR Code Ready
            </h3>
            <p className="text-gray-500">
              Get a unique QR code for your restaurant. Customers scan and instantly see your menu — no app download needed.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="text-4xl mb-4">🌦️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Weather-Adaptive
            </h3>
            <p className="text-gray-500">
              Menu theme and featured items change based on real-time weather in your city. Rain brings warm vibes, sun brings energy.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Mood Rules
            </h3>
            <p className="text-gray-500">
              Configure how your menu adapts. Set mood rules for rainy days, sunny afternoons, late nights — you control the experience.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24 lg:pb-32">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: "1", title: "Create", desc: "Sign up and add your restaurant with its city" },
            { step: "2", title: "Build", desc: "Add categories, items, photos, and prices" },
            { step: "3", title: "Configure", desc: "Set mood rules — what to feature when it rains, etc." },
            { step: "4", title: "Share", desc: "Get your QR code, print it, place it on tables" },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-14 sm:pb-20">
        <div className="bg-linear-to-r from-orange-500 to-purple-600 rounded-3xl p-12 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to give your menu a mood?
          </h2>
          <p className="text-base sm:text-lg opacity-90 mb-8">
            Free to start. Set up in under 5 minutes.
          </p>
          <Link
            href="/register"
            className="bg-white text-gray-900 font-semibold px-8 py-3.5 rounded-xl text-base sm:text-lg transition hover:bg-gray-100 inline-block"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-center text-gray-400 text-sm border-t border-gray-100">
        MoodMenu — Smart digital menus for restaurants in Nepal
      </footer>
    </div>
  );
}

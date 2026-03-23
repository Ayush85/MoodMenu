import Link from "next/link";

export default function MenuNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">🍽️</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Menu not found</h1>
        <p className="text-gray-500 text-sm mb-6">
          This restaurant menu doesn&apos;t exist or may have been removed.
        </p>
        <Link
          href="/"
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition text-sm inline-block"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}

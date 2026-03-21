"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Restaurant {
  id: string;
  name: string;
  city: string;
  slug: string;
  categories: { items: unknown[] }[];
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const isStaff = session?.user?.actorType === "STAFF";

  useEffect(() => {
    fetch("/api/restaurants")
      .then((res) => res.json())
      .then((data) => {
        setRestaurants(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <h1 className="page-title">Your Restaurants</h1>
        {!isStaff && (
          <Link
            href="/dashboard/restaurant/new"
            className="btn-primary w-full sm:w-auto text-center"
          >
            + Add Restaurant
          </Link>
        )}
      </div>

      {restaurants.length === 0 ? (
        <div className="surface-card p-8 sm:p-12 text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No restaurants yet
          </h2>
          <p className="text-gray-500 mb-6">
            {isStaff
              ? "No restaurant is assigned to your staff account yet."
              : "Create your first restaurant to start building your smart menu."}
          </p>
          {!isStaff && (
            <Link
              href="/dashboard/restaurant/new"
              className="btn-primary inline-flex w-full sm:w-auto"
            >
              Create Restaurant
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((r) => {
            const itemCount = r.categories.reduce(
              (acc, cat) => acc + cat.items.length,
              0
            );
            return (
              <Link
                key={r.id}
                href={`/dashboard/restaurant/${r.id}/menu`}
                className="surface-card p-6 hover:shadow-md transition group"
              >
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-orange-500 transition">
                  {r.name}
                </h3>
                <p className="text-gray-500 mt-1">{r.city}</p>
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
                  <span>{r.categories.length} categories</span>
                  <span>{itemCount} items</span>
                </div>
                <div className="mt-4 text-xs text-gray-400 font-mono">
                  /menu/{r.slug}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

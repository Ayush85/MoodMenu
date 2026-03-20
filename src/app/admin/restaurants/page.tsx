"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  city: string;
  createdAt: string;
  owner: { name: string; email: string };
  _count: { categories: number; moodRules: number };
  categories: { _count: { items: number } }[];
}

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  function fetchRestaurants() {
    fetch("/api/admin/restaurants")
      .then((res) => res.json())
      .then((data) => {
        setRestaurants(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchRestaurants();
  }, []);

  async function deleteRestaurant(restaurantId: string, name: string) {
    if (!confirm(`Delete "${name}"? This will remove all its menu items and mood rules.`)) return;
    await fetch("/api/admin/restaurants", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId }),
    });
    fetchRestaurants();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">All Restaurants</h1>

      {restaurants.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
          No restaurants created yet
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((r) => {
            const totalItems = r.categories.reduce((acc, c) => acc + c._count.items, 0);
            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{r.name}</h3>
                    <p className="text-sm text-gray-500">{r.city}</p>
                  </div>
                  <Link
                    href={`/menu/${r.slug}`}
                    target="_blank"
                    className="text-xs text-orange-500 hover:text-orange-600 font-mono"
                  >
                    /menu/{r.slug}
                  </Link>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {r.owner.name} ({r.owner.email})
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400 mt-2">
                    <span>{r._count.categories} categories</span>
                    <span>{totalItems} items</span>
                    <span>{r._count.moodRules} mood rules</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => deleteRestaurant(r.id, r.name)}
                    className="text-sm text-red-500 hover:text-red-600 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  if (loading) {
    return (
      <div className="page-shell">
        {/* Skeleton loading */}
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-2" />
          <div className="h-5 w-32 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="surface-card p-6">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-3" />
              <div className="h-4 w-20 bg-gray-100 rounded animate-pulse mb-4" />
              <div className="h-4 w-full bg-gray-50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell animate-fade-in">
      {/* Welcome banner */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          {getGreeting()},{" "}
          <span className="gradient-text">
            {session?.user?.name?.split(" ")[0] || "there"}
          </span>
        </h1>
        <p className="text-gray-500 mt-1">
          {restaurants.length > 0
            ? `You have ${restaurants.length} restaurant${restaurants.length > 1 ? "s" : ""}`
            : "Let\u2019s set up your first restaurant"}
        </p>
      </div>

      {/* Header with action */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Your Restaurants</h2>
        {!isStaff && (
          <Link
            href="/dashboard/restaurant/new"
            className="btn-primary !text-sm !px-4 !py-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Restaurant
          </Link>
        )}
      </div>

      {restaurants.length === 0 ? (
        <div className="surface-card p-10 sm:p-14 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500/10 via-rose-500/10 to-violet-500/10 flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">🍽️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            No restaurants yet
          </h2>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            {isStaff
              ? "No restaurant is assigned to your staff account yet."
              : "Create your first restaurant to start building your smart menu."}
          </p>
          {!isStaff && (
            <Link
              href="/dashboard/restaurant/new"
              className="btn-primary"
            >
              Create Restaurant
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {restaurants.map((r, i) => {
            const itemCount = r.categories.reduce(
              (acc, cat) => acc + cat.items.length,
              0
            );
            return (
              <Link
                key={r.id}
                href={`/dashboard/restaurant/${r.id}/menu`}
                className={`surface-card p-6 group hover:-translate-y-1 transition-all duration-300 animate-fade-in-up stagger-${Math.min(i + 1, 5)}`}
              >
                {/* Gradient accent top */}
                <div className="w-full h-1 rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-violet-600 mb-5 opacity-60 group-hover:opacity-100 transition-opacity" />
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                  {r.name}
                </h3>
                <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {r.city}
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                    {r.categories.length} categories
                  </span>
                  <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                    {itemCount} items
                  </span>
                </div>
                <div className="mt-4 text-xs text-gray-400 font-mono flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
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

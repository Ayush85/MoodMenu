"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewRestaurantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      city: formData.get("city") as string,
      slug: formData.get("slug") as string,
    };

    try {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Failed to create restaurant");
        setLoading(false);
        return;
      }

      const restaurant = await res.json();
      router.push(`/dashboard/restaurant/${restaurant.id}/menu`);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="page-shell max-w-2xl animate-fade-in-up">
      <div className="mb-8">
        <h1 className="page-title">Create Restaurant</h1>
        <p className="page-subtitle mt-1">Set up your restaurant to build a smart digital menu</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm animate-fade-in">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="surface-card p-6 sm:p-8 space-y-6">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-1 rounded-full bg-gradient-to-r from-orange-500 to-rose-500" />
          <div className="w-8 h-1 rounded-full bg-gray-200" />
          <div className="w-8 h-1 rounded-full bg-gray-200" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Restaurant Name
          </label>
          <input
            type="text"
            name="name"
            required
            className="control-input !py-3"
            placeholder="Momo House Manthali"
            onChange={(e) => {
              const slugInput = e.currentTarget.form?.querySelector(
                'input[name="slug"]'
              ) as HTMLInputElement;
              if (slugInput) slugInput.value = generateSlug(e.target.value);
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            City
          </label>
          <input
            type="text"
            name="city"
            required
            className="control-input !py-3"
            placeholder="Kathmandu"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Used to automatically resolve the restaurant location for weather-based menu adaptation
          </p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            URL Slug
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 font-mono bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-100">/menu/</span>
            <input
              type="text"
              name="slug"
              required
              pattern="[a-z0-9-]+"
              className="control-input flex-1 font-mono !py-3"
              placeholder="momo-house-manthali"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Lowercase letters, numbers, and hyphens only
          </p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full !py-3.5"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating...
            </span>
          ) : (
            "Create Restaurant"
          )}
        </button>
      </form>
    </div>
  );
}

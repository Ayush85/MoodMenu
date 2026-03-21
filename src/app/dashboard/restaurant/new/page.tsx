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
    <div className="page-shell max-w-2xl">
      <h1 className="page-title mb-6 sm:mb-8">
        Create Restaurant
      </h1>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 surface-card p-5 sm:p-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Restaurant Name
          </label>
          <input
            type="text"
            name="name"
            required
            className="control-input"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City
          </label>
          <input
            type="text"
            name="city"
            required
            className="control-input"
            placeholder="Kathmandu"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL Slug
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">/menu/</span>
            <input
              type="text"
              name="slug"
              required
              pattern="[a-z0-9-]+"
              className="control-input flex-1 font-mono"
              placeholder="momo-house-manthali"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Lowercase letters, numbers, and hyphens only
          </p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3"
        >
          {loading ? "Creating..." : "Create Restaurant"}
        </button>
      </form>
    </div>
  );
}

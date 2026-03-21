"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  isAvailable: boolean;
  tags: string[];
}

interface Category {
  id: string;
  name: string;
  order: number;
  items: MenuItem[];
}

interface Restaurant {
  id: string;
  name: string;
  city: string;
  slug: string;
  categories: Category[];
}

export default function MenuManagePage() {
  const params = useParams();
  const id = params.id as string;
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState("");
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    price: "",
    tags: "",
    image: "",
  });

  function fetchRestaurant() {
    fetch(`/api/restaurants/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setRestaurant(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchRestaurant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addCategory() {
    if (!newCategory.trim()) return;
    await fetch(`/api/restaurants/${id}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategory }),
    });
    setNewCategory("");
    fetchRestaurant();
  }

  async function deleteCategory(categoryId: string) {
    await fetch(`/api/restaurants/${id}/categories`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });
    fetchRestaurant();
  }

  async function addItem(categoryId: string) {
    if (!itemForm.name || !itemForm.price) return;
    await fetch(`/api/restaurants/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...itemForm,
        tags: itemForm.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        categoryId,
      }),
    });
    setItemForm({ name: "", description: "", price: "", tags: "", image: "" });
    setAddingItem(null);
    fetchRestaurant();
  }

  async function deleteItem(itemId: string) {
    await fetch(`/api/restaurants/${id}/items/${itemId}`, {
      method: "DELETE",
    });
    fetchRestaurant();
  }

  async function toggleAvailability(item: MenuItem) {
    await fetch(`/api/restaurants/${id}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });
    fetchRestaurant();
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setItemForm((prev) => ({ ...prev, image: data.url }));
      }
    } catch {
      alert("Image upload failed. Check your Cloudinary credentials.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!restaurant) return <div>Restaurant not found</div>;

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="page-title">{restaurant.name}</h1>
          <p className="page-subtitle">{restaurant.city}</p>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <Link
            href={`/dashboard/restaurant/${id}/tables`}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition text-center"
          >
            Tables & WiFi
          </Link>
          <Link
            href={`/dashboard/restaurant/${id}/staff`}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition text-center"
          >
            Staff Panel
          </Link>
          <Link
            href={`/dashboard/restaurant/${id}/mood`}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition text-center"
          >
            Mood Rules
          </Link>
          <Link
            href={`/dashboard/restaurant/${id}/qr`}
            className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition text-center"
          >
            QR Code
          </Link>
          <Link
            href={`/menu/${restaurant.slug}`}
            target="_blank"
            className="btn-primary col-span-2 sm:col-span-1 text-center"
          >
            View Menu
          </Link>
        </div>
      </div>

      {/* Add Category */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category name (e.g., Appetizers)"
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
          onKeyDown={(e) => e.key === "Enter" && addCategory()}
        />
        <button
          onClick={addCategory}
          className="btn-primary w-full sm:w-auto"
        >
          Add Category
        </button>
      </div>

      {/* Categories & Items */}
      {restaurant.categories.length === 0 ? (
        <div className="surface-card p-8 text-center text-gray-500">
          Add a category to start building your menu
        </div>
      ) : (
        <div className="space-y-6">
          {restaurant.categories.map((cat) => (
            <div
              key={cat.id}
              className="surface-card overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6 py-4 bg-gray-50 border-b">
                <h2 className="text-lg font-bold text-gray-900">{cat.name}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setAddingItem(addingItem === cat.id ? null : cat.id)
                    }
                    className="text-orange-500 hover:text-orange-600 text-sm font-semibold"
                  >
                    + Add Item
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="text-red-400 hover:text-red-500 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Add Item Form */}
              {addingItem === cat.id && (
                <div className="px-4 sm:px-6 py-4 bg-orange-50 border-b space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Item name"
                      value={itemForm.name}
                      onChange={(e) =>
                        setItemForm((p) => ({ ...p, name: e.target.value }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Price (NPR)"
                      value={itemForm.price}
                      onChange={(e) =>
                        setItemForm((p) => ({ ...p, price: e.target.value }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={itemForm.description}
                    onChange={(e) =>
                      setItemForm((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Tags (comma separated: hot, spicy, vegan)"
                    value={itemForm.tags}
                    onChange={(e) =>
                      setItemForm((p) => ({ ...p, tags: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="text-sm"
                    />
                    {itemForm.image && (
                      <span className="text-green-600 text-xs">Image uploaded</span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => addItem(cat.id)}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                      Save Item
                    </button>
                    <button
                      onClick={() => setAddingItem(null)}
                      className="text-gray-500 hover:text-gray-700 px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="divide-y">
                {cat.items.length === 0 ? (
                  <div className="px-4 sm:px-6 py-4 text-gray-400 text-sm">
                    No items yet
                  </div>
                ) : (
                  cat.items.map((item) => (
                    <div
                      key={item.id}
                      className="px-4 sm:px-6 py-4"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <h3
                              className={`font-semibold ${
                                item.isAvailable
                                  ? "text-gray-900"
                                  : "text-gray-400 line-through"
                              }`}
                            >
                              {item.name}
                            </h3>
                            {item.description && (
                              <p className="text-gray-500 text-sm">
                                {item.description}
                              </p>
                            )}
                            {item.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {item.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                          <span className="font-bold text-gray-900">
                            Rs. {item.price}
                          </span>
                          <button
                            onClick={() => toggleAvailability(item)}
                            className={`text-xs px-3 py-1 rounded-full ${
                              item.isAvailable
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {item.isAvailable ? "Available" : "Unavailable"}
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="text-red-400 hover:text-red-500 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  isSpecial: boolean;
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
  logo: string | null;
  categories: Category[];
}

const NAV_ITEMS = [
  { key: "menu", label: "Menu", icon: "M4 6h16M4 12h16M4 18h7" },
  { key: "tables", label: "Tables & WiFi", icon: "M3 10h18M3 14h18M3 6h18M3 18h18" },
  { key: "staff", label: "Staff", icon: "M17 20h5V4H2v16h5m10 0v-8a2 2 0 00-2-2H9a2 2 0 00-2 2v8m10 0H7" },
  { key: "mood", label: "Mood Rules", icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" },
  { key: "qr", label: "QR Codes", icon: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" },
];

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
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", price: "", tags: "", image: "" });
  const [savingEdit, setSavingEdit] = useState(false);

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

  async function toggleSpecial(item: MenuItem) {
    await fetch(`/api/restaurants/${id}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSpecial: !item.isSpecial }),
    });
    fetchRestaurant();
  }

  function openEdit(item: MenuItem) {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      tags: item.tags.join(", "),
      image: item.image || "",
    });
  }

  async function saveEdit() {
    if (!editingItem) return;
    setSavingEdit(true);
    await fetch(`/api/restaurants/${id}/items/${editingItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        description: editForm.description || null,
        price: editForm.price,
        tags: editForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        image: editForm.image || null,
      }),
    });
    setSavingEdit(false);
    setEditingItem(null);
    fetchRestaurant();
  }

  async function handleEditImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setEditForm((p) => ({ ...p, image: data.url }));
    } catch {
      alert("Image upload failed");
    }
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
      <div className="page-shell">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-6" />
        <div className="h-12 w-full bg-gray-100 rounded-xl animate-pulse mb-6" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="surface-card p-6">
              <div className="h-5 w-28 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!restaurant) return <div>Restaurant not found</div>;

  return (
    <div className="page-shell animate-fade-in">
      {/* Header with logo */}
      <div className="flex items-center gap-4 mb-6">
        <label className="relative group cursor-pointer shrink-0">
          {restaurant.logo ? (
            <img src={restaurant.logo} alt={restaurant.name} className="w-14 h-14 rounded-2xl object-cover ring-1 ring-gray-200" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center">
              <span className="text-2xl">🍽️</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.append("file", file);
              const res = await fetch("/api/upload", { method: "POST", body: fd });
              const data = await res.json();
              if (data.url) {
                await fetch(`/api/restaurants/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ logo: data.url }),
                });
                fetchRestaurant();
              }
            }}
          />
        </label>
        <div>
          <h1 className="page-title">{restaurant.name}</h1>
          <p className="page-subtitle flex items-center gap-1 mt-0.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {restaurant.city}
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-6 -mx-1 px-1">
        {NAV_ITEMS.map((item) => {
          const href = item.key === "menu"
            ? `/dashboard/restaurant/${id}/menu`
            : `/dashboard/restaurant/${id}/${item.key}`;
          const isActive = item.key === "menu";

          return (
            <Link
              key={item.key}
              href={href}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
        <Link
          href={`/menu/${restaurant.slug}`}
          target="_blank"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap btn-primary !py-2 !px-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View Menu
        </Link>
      </div>

      {/* Add Category */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category name (e.g., Appetizers)"
          className="control-input flex-1 !py-3"
          onKeyDown={(e) => e.key === "Enter" && addCategory()}
        />
        <button
          onClick={addCategory}
          className="btn-soft !font-semibold w-full sm:w-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Category
        </button>
      </div>

      {/* Categories & Items */}
      {restaurant.categories.length === 0 ? (
        <div className="surface-card p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📋</span>
          </div>
          <p className="text-gray-500">
            Add a category to start building your menu
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {restaurant.categories.map((cat) => (
            <div
              key={cat.id}
              className="surface-card overflow-hidden"
            >
              {/* Category header */}
              <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 rounded-full bg-gradient-to-b from-orange-500 to-rose-500" />
                  <h2 className="text-base font-bold text-gray-900">{cat.name}</h2>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{cat.items.length}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      setAddingItem(addingItem === cat.id ? null : cat.id)
                    }
                    className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Item
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="text-sm text-red-400 hover:text-red-500 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Add Item Form */}
              {addingItem === cat.id && (
                <div className="px-5 sm:px-6 py-5 bg-orange-50/50 border-b border-orange-100 space-y-3 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Item name"
                      value={itemForm.name}
                      onChange={(e) =>
                        setItemForm((p) => ({ ...p, name: e.target.value }))
                      }
                      className="control-input !bg-white"
                    />
                    <input
                      type="number"
                      placeholder="Price (NPR)"
                      value={itemForm.price}
                      onChange={(e) =>
                        setItemForm((p) => ({ ...p, price: e.target.value }))
                      }
                      className="control-input !bg-white"
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
                    className="control-input w-full !bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Tags (comma separated: hot, spicy, vegan)"
                    value={itemForm.tags}
                    onChange={(e) =>
                      setItemForm((p) => ({ ...p, tags: e.target.value }))
                    }
                    className="control-input w-full !bg-white"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
                    />
                    {itemForm.image && (
                      <span className="text-green-600 text-xs flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Image uploaded
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => addItem(cat.id)}
                      className="btn-primary !text-sm"
                    >
                      Save Item
                    </button>
                    <button
                      onClick={() => setAddingItem(null)}
                      className="btn-soft !text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="divide-y divide-gray-100">
                {cat.items.length === 0 ? (
                  <div className="px-5 sm:px-6 py-6 text-gray-400 text-sm text-center">
                    No items yet — click &quot;Add Item&quot; to get started
                  </div>
                ) : (
                  cat.items.map((item) => (
                    <div
                      key={item.id}
                      className="px-5 sm:px-6 py-4 hover:bg-gray-50/50 transition"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-14 h-14 rounded-xl object-cover shrink-0 ring-1 ring-gray-100"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-50 to-rose-50 flex items-center justify-center shrink-0">
                              <span className="text-xl">🍽️</span>
                            </div>
                          )}
                          <div>
                            <h3
                              className={`font-semibold text-sm ${
                                item.isAvailable
                                  ? "text-gray-900"
                                  : "text-gray-400 line-through"
                              }`}
                            >
                              {item.name}
                            </h3>
                            {item.description && (
                              <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">
                                {item.description}
                              </p>
                            )}
                            {item.tags.length > 0 && (
                              <div className="flex gap-1 mt-1.5">
                                {item.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-[10px] font-medium bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                          <span className="font-bold text-gray-900 text-sm">
                            Rs. {item.price}
                          </span>
                          <button
                            onClick={() => toggleAvailability(item)}
                            className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                              item.isAvailable
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {item.isAvailable ? "Available" : "Unavailable"}
                          </button>
                          <button
                            onClick={() => toggleSpecial(item)}
                            className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                              item.isSpecial
                                ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {item.isSpecial ? "⭐ Special" : "Set Special"}
                          </button>
                          <button
                            onClick={() => openEdit(item)}
                            className="text-xs px-3 py-1.5 rounded-full font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="text-sm text-red-400 hover:text-red-500 transition"
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

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditingItem(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Edit Item</h3>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="control-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Price (NPR)</label>
                <input
                  type="number"
                  value={editForm.price}
                  onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
                  className="control-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="control-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tags (comma separated)</label>
                <input
                  value={editForm.tags}
                  onChange={(e) => setEditForm((p) => ({ ...p, tags: e.target.value }))}
                  className="control-input"
                  placeholder="hot, spicy, popular"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Image</label>
                {editForm.image && (
                  <img src={editForm.image} alt="Preview" className="w-20 h-20 rounded-xl object-cover mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEditImageUpload}
                  className="text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingItem(null)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="flex-1 btn-primary !rounded-xl disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

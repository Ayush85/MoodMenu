"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Toast";
import type { MenuItemOption, OrderTicket, RestaurantTableData } from "./types";

interface Props {
  restaurantId: string;
  canTakeOrders: boolean;
  open: boolean;
  onClose: () => void;
  onCreated: (order: OrderTicket) => void;
}

export default function OrderComposer({ restaurantId, canTakeOrders, open, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const [tables, setTables] = useState<RestaurantTableData[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [orderNote, setOrderNote] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    if (!open || !canTakeOrders) return;

    fetch(`/api/restaurants/${restaurantId}`)
      .then((response) => response.json())
      .then((data) => {
        const tableData = (data?.tables || []) as RestaurantTableData[];
        const categoryData = (data?.categories || []) as Array<{
          id: string;
          name: string;
          items: Array<{ id: string; name: string; price: number; isAvailable: boolean }>;
        }>;
        const itemData = categoryData.flatMap((category) =>
          (category.items || []).map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            isAvailable: item.isAvailable,
            categoryId: category.id,
            categoryName: category.name,
          })),
        );

        setTables(tableData.sort((a, b) => a.number - b.number));
        setMenuItems(itemData);
      })
      .catch(() => {
        setTables([]);
        setMenuItems([]);
      });
  }, [canTakeOrders, open, restaurantId]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  function incrementItem(itemId: string) {
    setSelectedItems((previous) => ({ ...previous, [itemId]: (previous[itemId] || 0) + 1 }));
  }

  function decrementItem(itemId: string) {
    setSelectedItems((previous) => {
      const next = { ...previous };
      next[itemId] = Math.max((next[itemId] || 0) - 1, 0);
      if (next[itemId] === 0) delete next[itemId];
      return next;
    });
  }

  function removeItem(itemId: string) {
    setSelectedItems((previous) => {
      const next = { ...previous };
      delete next[itemId];
      return next;
    });
  }

  const orderDraft = useMemo(() => {
    return menuItems
      .filter((item) => (selectedItems[item.id] || 0) > 0)
      .map((item) => {
        const quantity = selectedItems[item.id];
        return {
          itemId: item.id,
          itemName: item.name,
          quantity,
          unitPrice: item.price,
          lineTotal: quantity * item.price,
        };
      });
  }, [menuItems, selectedItems]);

  const orderTotal = orderDraft.reduce((sum, row) => sum + row.lineTotal, 0);
  const selectedTable = tables.find((table) => table.id === selectedTableId) || null;
  const availableMenuItems = useMemo(() => menuItems.filter((item) => item.isAvailable), [menuItems]);
  const unavailableCount = menuItems.length - availableMenuItems.length;
  const filteredMenuItems = useMemo(() => {
    const search = itemSearch.trim().toLowerCase();
    if (!search) return availableMenuItems;
    return availableMenuItems.filter((item) => item.name.toLowerCase().includes(search));
  }, [availableMenuItems, itemSearch]);
  const groupedMenuItems = useMemo(() => {
    const groups = new Map<string, { categoryId: string; categoryName: string; items: MenuItemOption[] }>();
    for (const item of filteredMenuItems) {
      const group = groups.get(item.categoryId);
      if (group) group.items.push(item);
      else groups.set(item.categoryId, { categoryId: item.categoryId, categoryName: item.categoryName, items: [item] });
    }
    return Array.from(groups.values());
  }, [filteredMenuItems]);

  function fmt(value: number) {
    return Math.round(value).toLocaleString("en-IN");
  }

  function clearDraft() {
    setSelectedItems({});
    setOrderNote("");
  }

  async function submitOrder() {
    if (!selectedTableId) {
      toast("Please select a table", "error");
      return;
    }
    if (orderDraft.length === 0) {
      toast("Add at least one item", "error");
      return;
    }

    setSavingOrder(true);
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: selectedTableId,
          note: orderNote,
          items: orderDraft.map((row) => ({
            itemName: row.itemName,
            quantity: row.quantity,
            unitPrice: row.unitPrice,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast(data.error || "Could not create order", "error");
        return;
      }

      const createdOrder = (await response.json()) as OrderTicket;
      onCreated(createdOrder);
      clearDraft();
      onClose();
      toast("Order created");
    } finally {
      setSavingOrder(false);
    }
  }

  if (!open || !canTakeOrders) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button aria-label="Close order composer" onClick={onClose} className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />
      <section role="dialog" aria-modal="true" aria-labelledby="new-order-title" className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-500">Staff order</p>
            <h2 id="new-order-title" className="mt-1 text-xl font-extrabold text-gray-900">Create new order</h2>
            <p className="mt-0.5 text-xs text-gray-500">Add items for a table and send them to the kitchen.</p>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500" aria-label="Close">
            <span className="text-xl">×</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="space-y-4">
            <div>
              <label className="field-label">Table</label>
              <div className="mt-1.5 grid grid-cols-4 gap-2 sm:grid-cols-5">
                {tables.map((table) => {
                  const active = table.id === selectedTableId;
                  return (
                    <button key={table.id} onClick={() => setSelectedTableId(active ? "" : table.id)} className={`flex min-h-14 flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-center transition ${active ? "border-orange-500 bg-orange-500 text-white shadow-sm" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"}`}>
                      <span className="text-sm font-extrabold leading-tight">{table.number}</span>
                      {table.label && <span className={`w-full truncate text-[10px] leading-tight ${active ? "text-white/80" : "text-gray-400"}`}>{table.label}</span>}
                    </button>
                  );
                })}
                {tables.length === 0 && <p className="col-span-full py-3 text-center text-xs text-gray-400">No tables configured yet</p>}
              </div>
            </div>

            <div>
              <label className="field-label">Add menu items</label>
              <input value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} placeholder="Search by item name" className="control-input mt-1 w-full" autoFocus />
            </div>

            <div className="max-h-72 space-y-3 overflow-y-auto rounded-2xl border border-gray-200 p-2">
              {groupedMenuItems.map((group) => (
                <div key={group.categoryId}>
                  <p className="sticky top-0 z-10 -mx-2 bg-white/95 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-400 backdrop-blur">{group.categoryName}</p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const quantity = selectedItems[item.id] || 0;
                      return (
                        <div key={item.id} className={`flex min-h-14 items-center justify-between gap-3 rounded-xl px-3 py-2 transition ${quantity > 0 ? "bg-orange-50 ring-1 ring-orange-200" : "hover:bg-gray-50"}`}>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-500">Rs. {fmt(item.price)}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button onClick={() => decrementItem(item.id)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-lg text-gray-700">−</button>
                            <span className="w-5 text-center text-sm font-extrabold">{quantity}</span>
                            <button onClick={() => incrementItem(item.id)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-lg text-white">+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {filteredMenuItems.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No matching menu items</p>}
            </div>
            {unavailableCount > 0 && <p className="text-[11px] text-gray-400">{unavailableCount} unavailable item{unavailableCount !== 1 ? "s" : ""} hidden</p>}

            <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-orange-700">Order summary</p>
                  <p className="mt-0.5 text-xs text-gray-500">{selectedTable ? selectedTable.label || `Table ${selectedTable.number}` : "Select a table"}</p>
                </div>
                <p className="text-lg font-extrabold text-gray-900">Rs. {fmt(orderTotal)}</p>
              </div>
              <div className="mt-3 space-y-2 border-t border-orange-100 pt-3">
                {orderDraft.length === 0 ? (
                  <p className="text-xs text-gray-400">Your order is empty</p>
                ) : (
                  orderDraft.map((row) => (
                    <div key={row.itemId} className="flex items-center justify-between gap-3 text-sm">
                      <span>{row.quantity} × {row.itemName}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Rs. {fmt(row.lineTotal)}</span>
                        <button onClick={() => removeItem(row.itemId)} aria-label={`Remove ${row.itemName}`} className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600">×</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="field-label">Kitchen note <span className="font-normal normal-case text-gray-400">(optional)</span></label>
              <textarea value={orderNote} onChange={(event) => setOrderNote(event.target.value)} rows={2} className="control-input mt-1 w-full resize-none" placeholder="Less spicy, no onions…" />
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 flex-col gap-2.5 border-t border-gray-100 bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6">
          {orderDraft.length > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{orderDraft.reduce((sum, row) => sum + row.quantity, 0)} item{orderDraft.reduce((sum, row) => sum + row.quantity, 0) !== 1 ? "s" : ""}</span>
              <span className="font-bold text-gray-900">Rs. {fmt(orderTotal)}</span>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={clearDraft} className="btn-soft flex-1">Clear</button>
            <button onClick={submitOrder} disabled={savingOrder || !selectedTableId || orderDraft.length === 0} className="btn-primary flex-[1.5]">
              {savingOrder ? "Sending…" : "Send to kitchen"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

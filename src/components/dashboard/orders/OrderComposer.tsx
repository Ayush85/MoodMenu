"use client";

import { readJson } from "@/lib/read-json";
import { useDialog } from "@/components/ui/use-dialog";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { scrollFocusedElementIntoView } from "./order-composer-mobile";
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadRetry, setLoadRetry] = useState(0);
  const [tables, setTables] = useState<RestaurantTableData[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [orderNote, setOrderNote] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [savingOrder, setSavingOrder] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !canTakeOrders) return;

    fetch(`/api/restaurants/${restaurantId}`)
      .then(readJson<{ tables: RestaurantTableData[]; categories: Array<{id: string; name: string; items: Array<{id: string; name: string; price: number; isAvailable: boolean}>}> }>)
      .then((data) => {
        setLoadError(null);
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
      .catch(() => { setLoadError("Unable to load tables and menu items. Your draft is preserved."); });
  }, [canTakeOrders, open, restaurantId, loadRetry]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const dialogRef = useDialog(open && canTakeOrders, onClose);

  useEffect(() => {
    if (!open) return;
    setTableSearch("");
    setItemSearch("");
    setSelectedCategoryId("all");
  }, [open]);

  useEffect(() => {
    // Auto-focusing search is a nice shortcut with a keyboard already
    // attached, but on a touch device it pops the on-screen keyboard too
    // eagerly. Wait until a table is picked so the desktop flow follows the
    // same order as the touch flow without stealing focus from table search.
    if (!open || !selectedTableId) return;
    if (window.matchMedia("(pointer: fine)").matches) {
      searchInputRef.current?.focus();
    }
  }, [open, selectedTableId]);

  useEffect(() => {
    if (!open || !window.visualViewport) return;

    const viewport = window.visualViewport;
    let frame = 0;
    const keepSearchVisible = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        scrollFocusedElementIntoView(searchInputRef.current, document.activeElement);
      });
    };

    viewport.addEventListener("resize", keepSearchVisible);
    viewport.addEventListener("scroll", keepSearchVisible);
    return () => {
      window.cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", keepSearchVisible);
      viewport.removeEventListener("scroll", keepSearchVisible);
    };
  }, [open]);

  function revealSearchInput() {
    window.requestAnimationFrame(() => {
      scrollFocusedElementIntoView(searchInputRef.current, document.activeElement, "smooth");
    });
  }

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
  const itemCount = orderDraft.reduce((sum, row) => sum + row.quantity, 0);
  const selectedTable = tables.find((table) => table.id === selectedTableId) || null;
  const filteredTables = useMemo(() => {
    const search = tableSearch.trim().toLowerCase();
    if (!search) return tables;
    return tables.filter((table) =>
      String(table.number).includes(search) || (table.label || "").toLowerCase().includes(search),
    );
  }, [tableSearch, tables]);
  const availableMenuItems = useMemo(() => menuItems.filter((item) => item.isAvailable), [menuItems]);
  const unavailableCount = menuItems.length - availableMenuItems.length;
  const categoryFilters = useMemo(() => {
    const filters = [{ id: "all", name: "All items", count: availableMenuItems.length }];
    const categories = new Map<string, { id: string; name: string; count: number }>();
    for (const item of availableMenuItems) {
      const category = categories.get(item.categoryId);
      if (category) category.count += 1;
      else categories.set(item.categoryId, { id: item.categoryId, name: item.categoryName, count: 1 });
    }
    return filters.concat(Array.from(categories.values()));
  }, [availableMenuItems]);
  const filteredMenuItems = useMemo(() => {
    const search = itemSearch.trim().toLowerCase();
    return availableMenuItems.filter((item) => {
      const matchesCategory = selectedCategoryId === "all" || item.categoryId === selectedCategoryId;
      const matchesSearch = !search || item.name.toLowerCase().includes(search);
      return matchesCategory && matchesSearch;
    });
  }, [availableMenuItems, itemSearch, selectedCategoryId]);
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
    if (savingOrder) return;
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
    } catch {
      toast("Unable to create the order. Your draft is kept here; please retry.", "error");
    } finally {
      setSavingOrder(false);
    }
  }

  if (!open || !canTakeOrders) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button aria-label="Close order composer" onClick={onClose} className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="new-order-title" className="relative flex h-[100dvh] min-h-0 max-h-none w-full max-w-none flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[min(92dvh,48rem)] sm:max-w-xl sm:rounded-3xl">
        <header className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-6 sm:py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-500">Staff order</p>
            <h2 id="new-order-title" className="mt-1 text-xl font-extrabold text-gray-900">Create new order</h2>
            <p className="mt-0.5 text-xs text-gray-500">Add items for a table and send them to the kitchen.</p>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500" aria-label="Close">
            <span className="text-xl">×</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto p-5 sm:p-6">
          <div className="space-y-4">
            {loadError && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{loadError}<button className="ml-2 min-h-11 underline" onClick={() => setLoadRetry(value => value + 1)}>Retry</button></div>}
            <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-extrabold text-white">1</span>
                  <div>
                    <p className="text-sm font-extrabold text-gray-900">Choose a table</p>
                    <p className="text-xs text-gray-500">Where should this order go?</p>
                  </div>
                </div>
                {selectedTable && <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold text-orange-700">{selectedTable.label || `Table ${selectedTable.number}`}</span>}
              </div>

              <div className="relative mt-3">
                <input
                  aria-label="Search tables"
                  value={tableSearch}
                  onChange={(event) => setTableSearch(event.target.value)}
                  placeholder="Search table number or name"
                  className="control-input w-full pr-10"
                />
                {tableSearch && <button type="button" onClick={() => setTableSearch("")} aria-label="Clear table search" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">×</button>}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {filteredTables.map((table) => {
                  const active = table.id === selectedTableId;
                  return (
                    <button
                      type="button"
                      key={table.id}
                      aria-pressed={active}
                      onClick={() => setSelectedTableId(active ? "" : table.id)}
                      className={`flex min-h-16 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition ${active ? "border-orange-500 bg-orange-500 text-white shadow-sm" : "border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50/50"}`}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-extrabold leading-tight">Table {table.number}</span>
                        <span className={`block truncate text-[11px] leading-tight ${active ? "text-white/80" : "text-gray-400"}`}>{table.label || "No label"}</span>
                      </span>
                      {active && <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-extrabold">✓</span>}
                    </button>
                  );
                })}
                {tables.length === 0 && <p className="col-span-full py-3 text-center text-xs text-gray-400">No tables configured yet</p>}
                {tables.length > 0 && filteredTables.length === 0 && <p className="col-span-full py-3 text-center text-xs text-gray-400">No tables match your search</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-extrabold text-white">2</span>
                  <div>
                    <p className="text-sm font-extrabold text-gray-900">Add menu items</p>
                    <p className="text-xs text-gray-500">Tap an item to add one, or use the controls to adjust quantity.</p>
                  </div>
                </div>
                {itemCount > 0 && <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold text-orange-700">{itemCount} item{itemCount === 1 ? "" : "s"}</span>}
              </div>

              <div className="relative mt-3">
                <input ref={searchInputRef} onFocus={revealSearchInput} value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} placeholder="Search menu items" aria-label="Search menu items" className="control-input w-full scroll-mt-4 pr-10" />
                {itemSearch && <button type="button" onClick={() => setItemSearch("")} aria-label="Clear item search" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">×</button>}
              </div>

              <div className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {categoryFilters.map((category) => {
                  const active = category.id === selectedCategoryId;
                  return (
                    <button
                      type="button"
                      key={category.id}
                      aria-pressed={active}
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition ${active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
                    >
                      {category.name}
                      <span className={active ? "text-white/70" : "text-gray-400"}>{category.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* No inner scroll on mobile — a scroll region nested inside the
                already-scrolling sheet body just traps the finger's drag on
                whichever region it started in. The list flows with the
                sheet's own scroll instead; sm+ (a mouse, more headroom)
                gets it back as a bounded, independently-scrolling panel. */}
            <div className="space-y-3 rounded-2xl border border-gray-200 p-2 sm:max-h-72 sm:overflow-y-auto">
              {groupedMenuItems.map((group) => (
                <div key={group.categoryId}>
                  <p className="sticky top-0 z-10 -mx-2 bg-white/95 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-400 backdrop-blur">{group.categoryName}</p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const quantity = selectedItems[item.id] || 0;
                      return (
                        <div key={item.id} className={`flex min-h-14 items-center gap-2 rounded-xl px-2 py-1.5 transition ${quantity > 0 ? "bg-orange-50 ring-1 ring-orange-200" : "hover:bg-gray-50"}`}>
                          <button type="button" onClick={() => incrementItem(item.id)} aria-label={`Add ${item.name}`} className="min-w-0 flex-1 rounded-lg px-1.5 py-1 text-left">
                            <p className="truncate text-sm font-bold text-gray-900">{item.name}</p>
                            <p className={`text-xs ${quantity > 0 ? "font-semibold text-orange-600" : "text-gray-500"}`}>{quantity > 0 ? "Tap to add more" : `Rs. ${fmt(item.price)} · Tap to add`}</p>
                          </button>
                          <div className="flex shrink-0 items-center gap-2">
                            {quantity > 0 && <button type="button" onClick={() => decrementItem(item.id)} aria-label={`Remove one ${item.name}`} className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-200 text-lg font-bold text-gray-700">−</button>}
                            {quantity > 0 && <span className="w-5 text-center text-sm font-extrabold">{quantity}</span>}
                            <button type="button" onClick={() => incrementItem(item.id)} aria-label={`Add ${item.name}`} className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-lg text-white">+</button>
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

        <footer className="sticky bottom-0 z-20 flex shrink-0 flex-col gap-2.5 border-t border-gray-100 bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.06)] sm:px-6 sm:pb-5">
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <p className="truncate font-bold text-gray-900">{selectedTable ? selectedTable.label || `Table ${selectedTable.number}` : "Choose a table"}</p>
              <p className="mt-0.5 text-gray-500">{itemCount > 0 ? `${itemCount} item${itemCount === 1 ? "" : "s"} ready` : "Add items to continue"}</p>
            </div>
            <span className="shrink-0 text-base font-extrabold text-gray-900">Rs. {fmt(orderTotal)}</span>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={clearDraft} className="btn-soft flex-1">Clear</button>
            <button type="button" onClick={submitOrder} disabled={savingOrder || !selectedTableId || orderDraft.length === 0} className="btn-primary flex-[1.5]">
              {savingOrder ? "Sending…" : "Send to kitchen"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

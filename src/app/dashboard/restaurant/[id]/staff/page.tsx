"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

interface WaiterCall {
  id: string;
  tableNumber: number;
  tableLabel: string | null;
  message: string | null;
  status: string;
  createdAt: string;
}

interface RawWaiterCall {
  id: string;
  message: string | null;
  status: string;
  createdAt: string;
  table: { number: number; label: string | null };
}

interface RestaurantTableData {
  id: string;
  number: number;
  label: string | null;
}

interface MenuItemOption {
  id: string;
  name: string;
  price: number;
}

interface OrderLine {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface OrderTicket {
  id: string;
  status: "NEW" | "PREPARING" | "SERVED" | "PAID" | "CANCELED";
  note: string | null;
  total: number;
  createdAt: string;
  table: { number: number; label: string | null };
  items: OrderLine[];
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "WAITER" | "COOK" | "CHEF";
  isActive: boolean;
  createdAt: string;
}

export default function StaffPage() {
  const params = useParams();
  const { data: session } = useSession();
  const id = params.id as string;
  const [pendingCalls, setPendingCalls] = useState<WaiterCall[]>([]);
  const [allCalls, setAllCalls] = useState<RawWaiterCall[]>([]);
  const [tables, setTables] = useState<RestaurantTableData[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [orders, setOrders] = useState<OrderTicket[]>([]);
  const [activeTab, setActiveTab] = useState<"calls" | "orders">("calls");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [orderNote, setOrderNote] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<"ALL" | OrderTicket["status"]>("ALL");
  const [orderTableFilter, setOrderTableFilter] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<StaffMember["role"]>("WAITER");
  const [addingStaff, setAddingStaff] = useState(false);
  const [connected, setConnected] = useState(false);
  const [prevCallCount, setPrevCallCount] = useState(0);
  const actorType = session?.user?.actorType;
  const staffRole = session?.user?.role as "WAITER" | "COOK" | "CHEF" | undefined;
  const canManageStaff = actorType === "USER";
  const canUseCalls = actorType === "USER" || staffRole === "WAITER";
  const canTakeOrders = actorType === "USER" || staffRole === "WAITER";

  useEffect(() => {
    if (!canUseCalls && activeTab === "calls") {
      setActiveTab("orders");
    }
  }, [canUseCalls, activeTab]);

  // SSE for real-time pending calls
  useEffect(() => {
    if (!canUseCalls) {
      setConnected(false);
      return;
    }

    const eventSource = new EventSource(`/api/restaurants/${id}/waiter-calls/stream`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "connected") {
        setConnected(true);
      }

      if (data.type === "calls") {
        const newCalls = data.calls as WaiterCall[];

        if (newCalls.length > prevCallCount) {
          playNotificationSound();
          showBrowserNotification(newCalls[0]);
        }

        setPendingCalls(newCalls);
        setPrevCallCount(newCalls.length);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => eventSource.close();
  }, [id, prevCallCount, canUseCalls]);

  // Load all calls history
  useEffect(() => {
    if (!canUseCalls) {
      setAllCalls([]);
      return;
    }

    fetch(`/api/restaurants/${id}/waiter-calls`)
      .then((r) => r.json())
      .then((data) => setAllCalls(Array.isArray(data) ? data : []))
      .catch(() => setAllCalls([]));
  }, [id, pendingCalls, canUseCalls]);

  // Load tables and menu items for order pad
  useEffect(() => {
    fetch(`/api/restaurants/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const tableData = (data?.tables || []) as RestaurantTableData[];
        const itemData = ((data?.categories || []) as Array<{ items: MenuItemOption[] }>)
          .flatMap((c) => c.items || [])
          .map((item) => ({ id: item.id, name: item.name, price: item.price }));

        setTables(tableData.sort((a, b) => a.number - b.number));
        setMenuItems(itemData);
      })
      .catch(() => {
        setTables([]);
        setMenuItems([]);
      });
  }, [id]);

  useEffect(() => {
    fetch(`/api/restaurants/${id}/orders`)
      .then((r) => r.json())
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]));
  }, [id]);

  useEffect(() => {
    if (!canManageStaff) {
      setStaff([]);
      return;
    }

    fetch(`/api/restaurants/${id}/staff-members`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setStaff(Array.isArray(data) ? data : []))
      .catch(() => setStaff([]));
  }, [id, canManageStaff]);

  function showBrowserNotification(call?: WaiterCall) {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted" && call) {
      const title = `Waiter Call: Table ${call.tableNumber}`;
      const body = call.message || "Customer requested assistance";
      new Notification(title, { body });
    }
  }

  async function enableNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }

  function playNotificationSound() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1000;
        osc2.type = "sine";
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.3);
      }, 200);
    } catch {
      // Audio not available
    }
  }

  async function updateCallStatus(callId: string, status: string) {
    await fetch(`/api/restaurants/${id}/waiter-calls`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId, status }),
    });
  }

  function incrementItem(itemId: string) {
    setSelectedItems((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  }

  function decrementItem(itemId: string) {
    setSelectedItems((prev) => {
      const next = { ...prev };
      next[itemId] = Math.max((next[itemId] || 0) - 1, 0);
      if (next[itemId] === 0) delete next[itemId];
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

  const selectedTable = tables.find((t) => t.id === selectedTableId) || null;

  const filteredMenuItems = useMemo(() => {
    const search = itemSearch.trim().toLowerCase();
    if (!search) return menuItems;
    return menuItems.filter((item) => item.name.toLowerCase().includes(search));
  }, [menuItems, itemSearch]);

  const orderCounts = useMemo(() => {
    return {
      NEW: orders.filter((o) => o.status === "NEW").length,
      PREPARING: orders.filter((o) => o.status === "PREPARING").length,
      SERVED: orders.filter((o) => o.status === "SERVED").length,
      PAID: orders.filter((o) => o.status === "PAID").length,
      CANCELED: orders.filter((o) => o.status === "CANCELED").length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (orderStatusFilter !== "ALL" && order.status !== orderStatusFilter) return false;
      if (orderTableFilter.trim()) {
        const token = orderTableFilter.trim().toLowerCase();
        const tableName = (order.table.label || `table ${order.table.number}`).toLowerCase();
        if (!tableName.includes(token)) return false;
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderTableFilter]);

  const paidRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status === "PAID")
      .reduce((sum, o) => sum + o.total, 0);
  }, [orders]);

  async function submitOrder() {
    if (!selectedTableId || orderDraft.length === 0) return;
    setSavingOrder(true);
    try {
      const res = await fetch(`/api/restaurants/${id}/orders`, {
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

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Could not create order");
        return;
      }

      const createdOrder = await res.json();
      setOrders((prev) => [createdOrder, ...prev]);
      setSelectedItems({});
      setOrderNote("");
      alert("Order created");
    } finally {
      setSavingOrder(false);
    }
  }

  async function updateOrderStatus(orderId: string, status: OrderTicket["status"]) {
    const res = await fetch(`/api/restaurants/${id}/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) return;

    const updated = (await res.json()) as OrderTicket;
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  }

  function canUpdateStatus(status: OrderTicket["status"]) {
    if (actorType === "USER") return true;
    if (staffRole === "WAITER") {
      return status === "SERVED" || status === "PAID" || status === "CANCELED";
    }
    if (staffRole === "COOK" || staffRole === "CHEF") {
      return status === "PREPARING" || status === "SERVED" || status === "CANCELED";
    }
    return false;
  }

  function clearDraft() {
    setSelectedItems({});
    setOrderNote("");
  }

  async function addStaffMember() {
    if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim()) return;
    setAddingStaff(true);
    try {
      const res = await fetch(`/api/restaurants/${id}/staff-members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStaffName,
          email: newStaffEmail,
          password: newStaffPassword,
          phone: newStaffPhone,
          role: newStaffRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Could not add staff member");
        return;
      }

      const created = (await res.json()) as StaffMember;
      setStaff((prev) => [created, ...prev]);
      setNewStaffName("");
      setNewStaffEmail("");
      setNewStaffPassword("");
      setNewStaffPhone("");
      setNewStaffRole("WAITER");
    } finally {
      setAddingStaff(false);
    }
  }

  async function updateStaffMember(staffId: string, payload: Partial<StaffMember>) {
    const res = await fetch(`/api/restaurants/${id}/staff-members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, ...payload }),
    });

    if (!res.ok) return;
    const updated = (await res.json()) as StaffMember;
    setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  async function deleteStaffMember(staffId: string) {
    const res = await fetch(`/api/restaurants/${id}/staff-members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId }),
    });

    if (!res.ok) return;
    setStaff((prev) => prev.filter((s) => s.id !== staffId));
  }

  async function resetStaffPassword(staffId: string) {
    const password = window.prompt("Enter new password for this staff member");
    if (!password) return;
    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    const res = await fetch(`/api/restaurants/${id}/staff-members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, password }),
    });

    if (!res.ok) {
      alert("Could not reset password");
      return;
    }

    alert("Staff password updated");
  }

  const activeWaiterCount = staff.filter((s) => s.isActive && s.role === "WAITER").length;
  const activeKitchenCount = staff.filter((s) => s.isActive && (s.role === "COOK" || s.role === "CHEF")).length;

  function timeAgo(date: string) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Panel</h1>
          <p className="text-gray-500 mt-1">Live waiter calls and quick order taking</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={enableNotifications}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Enable Alerts
          </button>
          <span className={`w-3 h-3 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          <span className="text-sm text-gray-500">{connected ? "Live" : "Disconnected"}</span>
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        {canUseCalls && (
          <button
            onClick={() => setActiveTab("calls")}
            className={`px-4 py-2 rounded-xl font-semibold text-sm ${activeTab === "calls" ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-700"}`}
          >
            Waiter Calls
          </button>
        )}
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2 rounded-xl font-semibold text-sm ${activeTab === "orders" ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-700"}`}
        >
          Orders
        </button>
      </div>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Staff Management</h2>
            <p className="text-sm text-gray-500">{canManageStaff ? "Admin can manage waiter and cook/chef counters here" : "Current active staff counters"}</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-2">
              <p className="text-xs text-blue-700 font-semibold">Waiter Counter</p>
              <p className="text-xl font-extrabold text-blue-900">{activeWaiterCount}</p>
            </div>
            <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-2">
              <p className="text-xs text-orange-700 font-semibold">Cook/Chef Counter</p>
              <p className="text-xl font-extrabold text-orange-900">{activeKitchenCount}</p>
            </div>
          </div>
        </div>

        {canManageStaff && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
            <input
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              placeholder="Staff name"
              className="px-3 py-2 rounded-xl border border-gray-300"
            />
            <input
              value={newStaffEmail}
              onChange={(e) => setNewStaffEmail(e.target.value)}
              placeholder="Email"
              className="px-3 py-2 rounded-xl border border-gray-300"
            />
            <input
              type="password"
              value={newStaffPassword}
              onChange={(e) => setNewStaffPassword(e.target.value)}
              placeholder="Password"
              className="px-3 py-2 rounded-xl border border-gray-300"
            />
            <input
              value={newStaffPhone}
              onChange={(e) => setNewStaffPhone(e.target.value)}
              placeholder="Phone (optional)"
              className="px-3 py-2 rounded-xl border border-gray-300"
            />
            <select
              value={newStaffRole}
              onChange={(e) => setNewStaffRole(e.target.value as StaffMember["role"])}
              className="px-3 py-2 rounded-xl border border-gray-300 bg-white"
            >
              <option value="WAITER">Waiter</option>
              <option value="COOK">Cook</option>
              <option value="CHEF">Chef</option>
            </select>
            <button
              onClick={addStaffMember}
              disabled={addingStaff || !newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim()}
              className="px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold disabled:opacity-50"
            >
              {addingStaff ? "Adding..." : "Add Staff"}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {staff.length === 0 ? (
            <p className="text-sm text-gray-400">No staff members added yet.</p>
          ) : (
            staff.map((member) => (
              <div key={member.id} className="border border-gray-200 rounded-xl px-3 py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.phone || "No phone"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500 font-mono">{member.email}</span>
                  {canManageStaff && (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) => updateStaffMember(member.id, { role: e.target.value as StaffMember["role"] })}
                        className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white"
                      >
                        <option value="WAITER">Waiter</option>
                        <option value="COOK">Cook</option>
                        <option value="CHEF">Chef</option>
                      </select>
                      <button
                        onClick={() => updateStaffMember(member.id, { isActive: !member.isActive })}
                        className={`text-xs px-3 py-1 rounded-full ${member.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}
                      >
                        {member.isActive ? "Active" : "Inactive"}
                      </button>
                      <button
                        onClick={() => deleteStaffMember(member.id)}
                        className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-700"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => resetStaffPassword(member.id)}
                        className="text-xs px-3 py-1 rounded-full bg-indigo-100 text-indigo-700"
                      >
                        Reset Password
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {activeTab === "calls" && canUseCalls && (
        <>
          {pendingCalls.length > 0 ? (
            <div className="space-y-4 mb-10">
              <h2 className="text-lg font-bold text-red-600 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                Active Calls ({pendingCalls.length})
              </h2>
              {pendingCalls.map((call) => (
                <div
                  key={call.id}
                  className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 flex items-center justify-between"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-red-500 text-white rounded-2xl flex items-center justify-center">
                      <span className="text-2xl font-extrabold">{call.tableNumber}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-red-900">
                        {call.tableLabel || `Table ${call.tableNumber}`}
                      </h3>
                      {call.message && (
                        <p className="text-red-700 mt-1">&quot;{call.message}&quot;</p>
                      )}
                      <p className="text-sm text-red-400 mt-1">{timeAgo(call.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => updateCallStatus(call.id, "ACKNOWLEDGED")}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-3 rounded-xl font-semibold transition"
                    >
                      On My Way
                    </button>
                    <button
                      onClick={() => updateCallStatus(call.id, "RESOLVED")}
                      className="bg-green-500 hover:bg-green-600 text-white px-5 py-3 rounded-xl font-semibold transition"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-12 text-center mb-10">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-green-900">All Clear</h2>
              <p className="text-green-600 mt-1">No pending waiter calls right now</p>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Recent Call History</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {allCalls.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">
                  No waiter calls yet
                </div>
              ) : (
                allCalls.map((call) => (
                  <div key={call.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                        call.status === "PENDING" ? "bg-red-500" :
                        call.status === "ACKNOWLEDGED" ? "bg-yellow-500" : "bg-green-500"
                      }`}>
                        {call.table?.number || "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {call.table?.label || `Table ${call.table?.number}`}
                        </p>
                        {call.message && (
                          <p className="text-sm text-gray-500">{call.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        call.status === "PENDING" ? "bg-red-100 text-red-700" :
                        call.status === "ACKNOWLEDGED" ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {call.status}
                      </span>
                      <span className="text-xs text-gray-400">{timeAgo(call.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === "orders" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold text-slate-500">New</p>
              <p className="text-2xl font-extrabold text-slate-900">{orderCounts.NEW}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[11px] font-semibold text-amber-600">Preparing</p>
              <p className="text-2xl font-extrabold text-amber-900">{orderCounts.PREPARING}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-[11px] font-semibold text-emerald-600">Served</p>
              <p className="text-2xl font-extrabold text-emerald-900">{orderCounts.SERVED}</p>
            </div>
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
              <p className="text-[11px] font-semibold text-cyan-600">Paid</p>
              <p className="text-2xl font-extrabold text-cyan-900">{orderCounts.PAID}</p>
            </div>
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
              <p className="text-[11px] font-semibold text-violet-600">Paid Revenue</p>
              <p className="text-2xl font-extrabold text-violet-900">Rs. {paidRevenue}</p>
            </div>
          </div>

          {canTakeOrders && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">Take New Order</h2>
                <p className="text-xs text-gray-500">Fast mode for table service</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Table</label>
                    <select
                      value={selectedTableId}
                      onChange={(e) => setSelectedTableId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white"
                    >
                      <option value="">Choose a table...</option>
                      {tables.map((table) => (
                        <option key={table.id} value={table.id}>
                          {table.label || `Table ${table.number}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Find Menu Item</label>
                    <input
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Search by item name"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-300"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                    {filteredMenuItems.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-xl px-3 py-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">Rs. {item.price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => decrementItem(item.id)}
                            className="w-7 h-7 rounded-lg border border-gray-300 text-gray-700"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">{selectedItems[item.id] || 0}</span>
                          <button
                            onClick={() => incrementItem(item.id)}
                            className="w-7 h-7 rounded-lg bg-gray-900 text-white"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredMenuItems.length === 0 && (
                      <div className="md:col-span-2 text-center py-6 text-sm text-gray-400 border border-dashed border-gray-300 rounded-xl">
                        No matching items found
                      </div>
                    )}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-2xl p-4 bg-slate-50">
                  <p className="text-sm font-bold text-gray-900 mb-1">Current Draft</p>
                  <p className="text-xs text-gray-500 mb-3">
                    {selectedTable ? (selectedTable.label || `Table ${selectedTable.number}`) : "No table selected"}
                  </p>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 mb-3">
                    {orderDraft.length === 0 ? (
                      <p className="text-sm text-gray-400">No items added yet</p>
                    ) : (
                      orderDraft.map((row) => (
                        <div key={row.itemId} className="flex justify-between text-sm">
                          <span>{row.quantity} x {row.itemName}</span>
                          <span className="font-semibold">Rs. {row.lineTotal}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <label className="block text-xs font-semibold text-gray-600 mb-1">Order Note</label>
                  <textarea
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm mb-3"
                    placeholder="No onion, less spicy, allergies..."
                  />

                  <div className="flex items-center justify-between mb-3 text-sm">
                    <span className="text-gray-600">Total</span>
                    <span className="text-lg font-extrabold text-gray-900">Rs. {orderTotal}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={clearDraft}
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold"
                    >
                      Clear
                    </button>
                    <button
                      onClick={submitOrder}
                      disabled={savingOrder || !selectedTableId || orderDraft.length === 0}
                      className="flex-1 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      {savingOrder ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
                <p className="text-xs text-gray-500">
                  Role: <span className="font-semibold">{actorType === "USER" ? "Admin" : (staffRole || "Staff")}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["ALL", "NEW", "PREPARING", "SERVED", "PAID", "CANCELED"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setOrderStatusFilter(status)}
                    className={`text-xs px-3 py-1.5 rounded-full border ${orderStatusFilter === status ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300"}`}
                  >
                    {status}
                  </button>
                ))}
                <input
                  value={orderTableFilter}
                  onChange={(e) => setOrderTableFilter(e.target.value)}
                  placeholder="Filter by table"
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-300"
                />
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">No orders yet</div>
              ) : (
                filteredOrders.map((order) => (
                  <div key={order.id} className="px-6 py-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-bold text-gray-900">{order.table.label || `Table ${order.table.number}`}</p>
                        <p className="text-xs text-gray-500">{timeAgo(order.createdAt)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-end">
                        {(["NEW", "PREPARING", "SERVED", "PAID", "CANCELED"] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => updateOrderStatus(order.id, status)}
                            disabled={!canUpdateStatus(status)}
                            title={!canUpdateStatus(status) ? "Not allowed for your role" : ""}
                            className={`text-xs px-2.5 py-1 rounded-full border disabled:opacity-40 ${order.status === status ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300"}`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="text-sm text-gray-700 space-y-1">
                      {order.items.map((line) => (
                        <div key={line.id} className="flex items-center justify-between">
                          <span>{line.quantity} x {line.itemName}</span>
                          <span>Rs. {line.lineTotal}</span>
                        </div>
                      ))}
                    </div>

                    {order.note && (
                      <p className="mt-2 text-sm text-gray-500">Note: {order.note}</p>
                    )}

                    <p className="mt-2 text-right font-bold text-gray-900">Total Rs. {order.total}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

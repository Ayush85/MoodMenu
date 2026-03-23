"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count: { restaurants: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  function fetchUsers() {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function toggleActive(userId: string, isActive: boolean) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, isActive: !isActive }),
    });
    fetchUsers();
  }

  async function changeRole(userId: string, role: string) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    fetchUsers();
  }

  async function resetPassword(userId: string) {
    const password = window.prompt("Enter new password for this user (min 6 chars):");
    if (!password) return;
    if (password.length < 6) { alert("Password must be at least 6 characters"); return; }
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, password }),
    });
    if (res.ok) alert("Password updated successfully");
    else alert("Failed to update password");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <h1 className="page-title mb-6 sm:mb-8">Manage Users</h1>

      <div className="space-y-3 md:hidden">
        {users.map((user) => (
          <div key={user.id} className="surface-card p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-semibold text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500 break-all">{user.email}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                user.isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}>
                {user.isActive ? "Active" : "Disabled"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
              <div>
                <p className="text-gray-400">Restaurants</p>
                <p className="font-semibold text-gray-800">{user._count.restaurants}</p>
              </div>
              <div>
                <p className="text-gray-400">Joined</p>
                <p className="font-semibold text-gray-800">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="space-y-3">
              <select
                value={user.role}
                onChange={(e) => changeRole(user.id, e.target.value)}
                className="control-input !py-2 !text-sm"
              >
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">Admin</option>
                <option value="CUSTOMER">Customer</option>
              </select>

              <button
                onClick={() => resetPassword(user.id)}
                className="w-full text-sm font-medium px-3 py-2 rounded-lg transition text-blue-600 bg-blue-50 hover:bg-blue-100"
              >
                Reset Password
              </button>
              <button
                onClick={() => toggleActive(user.id, user.isActive)}
                className={`w-full text-sm font-medium px-3 py-2 rounded-lg transition ${
                  user.isActive
                    ? "text-red-600 bg-red-50 hover:bg-red-100"
                    : "text-green-600 bg-green-50 hover:bg-green-100"
                }`}
              >
                {user.isActive ? "Disable User" : "Enable User"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">User</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Role</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Restaurants</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Joined</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    >
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="ADMIN">Admin</option>
                      <option value="CUSTOMER">Customer</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">{user._count.restaurants}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      user.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {user.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => resetPassword(user.id)}
                        className="text-sm font-medium px-3 py-1.5 rounded-lg transition text-blue-600 hover:bg-blue-50"
                      >
                        Reset PW
                      </button>
                      <button
                        onClick={() => toggleActive(user.id, user.isActive)}
                        className={`text-sm font-medium px-3 py-1.5 rounded-lg transition ${
                          user.isActive
                            ? "text-red-600 hover:bg-red-50"
                            : "text-green-600 hover:bg-green-50"
                        }`}
                      >
                        {user.isActive ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

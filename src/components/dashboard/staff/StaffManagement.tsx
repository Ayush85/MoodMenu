"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Trash2, UserPlus } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";
import { validatePassword } from "@/lib/password-policy";

type StaffRole = "WAITER" | "COOK" | "CHEF";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
}

interface Props {
  restaurantId: string;
  canManageStaff: boolean;
}

export default function StaffManagement({ restaurantId, canManageStaff }: Props) {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>("WAITER");
  const [addingStaff, setAddingStaff] = useState(false);
  const [showNewStaffPassword, setShowNewStaffPassword] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: "danger" | "primary";
    onConfirm: () => void;
  } | null>(null);
  const [resetPasswordStaff, setResetPasswordStaff] = useState<StaffMember | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    if (!canManageStaff) {
      setStaff([]);
      return;
    }

    fetch(`/api/restaurants/${restaurantId}/staff-members`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setStaff(Array.isArray(data) ? data : []))
      .catch(() => setStaff([]));
  }, [canManageStaff, restaurantId]);

  useEffect(() => {
    if (!resetPasswordStaff && !confirmAction) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (confirmAction) setConfirmAction(null);
      else setResetPasswordStaff(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmAction, resetPasswordStaff]);

  async function addStaffMember() {
    if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim()) return;
    setAddingStaff(true);
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/staff-members`, {
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

      if (!response.ok) {
        const data = await response.json();
        toast(data.error || "Could not add staff member", "error");
        return;
      }

      const created = (await response.json()) as StaffMember;
      setStaff((previous) => [created, ...previous]);
      setNewStaffName("");
      setNewStaffEmail("");
      setNewStaffPassword("");
      setNewStaffPhone("");
      setNewStaffRole("WAITER");
      toast("Staff member added");
    } finally {
      setAddingStaff(false);
    }
  }

  async function updateStaffMember(staffId: string, payload: Partial<StaffMember>) {
    const response = await fetch(`/api/restaurants/${restaurantId}/staff-members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, ...payload }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast((data as { error?: string }).error || "Could not update staff member", "error");
      return;
    }

    const updated = (await response.json()) as StaffMember;
    setStaff((previous) => previous.map((member) => member.id === updated.id ? updated : member));
  }

  async function deleteStaffMember(staffId: string) {
    const response = await fetch(`/api/restaurants/${restaurantId}/staff-members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast((data as { error?: string }).error || "Could not remove staff member", "error");
      return;
    }

    setStaff((previous) => previous.filter((member) => member.id !== staffId));
    toast("Staff member removed");
  }

  function confirmDeleteStaff(member: StaffMember) {
    setConfirmAction({
      title: "Remove staff member?",
      message: `${member.name} will lose access immediately. You'll need to re-add them to restore it.`,
      confirmLabel: "Remove",
      variant: "danger",
      onConfirm: () => {
        void deleteStaffMember(member.id);
        setConfirmAction(null);
      },
    });
  }

  async function submitPasswordReset() {
    if (!resetPasswordStaff) return;
    const passwordError = validatePassword(resetPasswordValue);
    if (passwordError) {
      toast(passwordError, "error");
      return;
    }

    setResettingPassword(true);
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/staff-members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: resetPasswordStaff.id, password: resetPasswordValue }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast((data as { error?: string }).error || "Could not reset password", "error");
        return;
      }

      toast(`Password updated for ${resetPasswordStaff.name}`);
      setResetPasswordStaff(null);
      setResetPasswordValue("");
    } finally {
      setResettingPassword(false);
    }
  }

  if (!canManageStaff) {
    return (
      <div className="page-shell space-y-4 sm:space-y-5">
        <header className="surface-card p-4 sm:p-5">
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle mt-1">Staff accounts can only be managed by the restaurant owner.</p>
        </header>
        <section className="surface-card p-6 text-center">
          <p className="text-sm text-gray-500">You can manage orders from the Orders workspace.</p>
        </section>
      </div>
    );
  }

  const activeWaiterCount = staff.filter((member) => member.isActive && member.role === "WAITER").length;
  const activeKitchenCount = staff.filter((member) => member.isActive && (member.role === "COOK" || member.role === "CHEF")).length;

  return (
    <div className="page-shell space-y-4 sm:space-y-5">
      <header className="surface-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="page-title">Staff Management</h1>
            <p className="page-subtitle mt-1">Manage staff accounts, roles, and access</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">Waiters {activeWaiterCount}</span>
            <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs text-orange-700">Kitchen {activeKitchenCount}</span>
          </div>
        </div>
      </header>

      <section className="surface-card p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-900">Add a staff member</h2>
          <span className="text-xs text-gray-500">New accounts can sign in immediately.</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div><label className="field-label">Name</label><input value={newStaffName} onChange={(event) => setNewStaffName(event.target.value)} placeholder="Full name" className="control-input mt-1 w-full" /></div>
          <div><label className="field-label">Email</label><input type="email" value={newStaffEmail} onChange={(event) => setNewStaffEmail(event.target.value)} placeholder="staff@restaurant.com" className="control-input mt-1 w-full" /></div>
          <div><label className="field-label">Phone <span className="font-normal normal-case text-gray-400">(optional)</span></label><input value={newStaffPhone} onChange={(event) => setNewStaffPhone(event.target.value)} placeholder="98XXXXXXXX" className="control-input mt-1 w-full" /></div>
          <div>
            <label className="field-label">Password</label>
            <div className="relative mt-1">
              <input type={showNewStaffPassword ? "text" : "password"} value={newStaffPassword} onChange={(event) => setNewStaffPassword(event.target.value)} placeholder="Min. 8 characters" className="control-input w-full pr-10" />
              <button type="button" onClick={() => setShowNewStaffPassword((value) => !value)} aria-label={showNewStaffPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNewStaffPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div><label className="field-label">Role</label><select value={newStaffRole} onChange={(event) => setNewStaffRole(event.target.value as StaffRole)} className="control-input mt-1 w-full"><option value="WAITER">Waiter</option><option value="COOK">Cook</option><option value="CHEF">Chef</option></select></div>
          <div className="flex items-end"><button onClick={addStaffMember} disabled={addingStaff || !newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim()} className="btn-primary flex w-full items-center justify-center gap-1.5"><UserPlus className="h-4 w-4" />{addingStaff ? "Adding…" : "Add Staff"}</button></div>
        </div>
      </section>

      <section className="surface-card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-gray-900">Team members</h2>
          <span className="text-xs text-gray-500">{staff.length} account{staff.length === 1 ? "" : "s"}</span>
        </div>
        <div className="space-y-2">
          {staff.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No staff members added yet.</p>
          ) : (
            staff.map((member) => (
              <div key={member.id} className="flex flex-col gap-3 rounded-2xl border border-gray-200 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${member.isActive ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-400"}`}>{member.name.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-gray-900">{member.name}</p>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${member.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{member.isActive ? "Active" : "Inactive"}</span>
                    </div>
                    <p className="truncate text-xs text-gray-500">{member.email}</p>
                    {member.phone && <p className="text-xs text-gray-400">{member.phone}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <select value={member.role} onChange={(event) => void updateStaffMember(member.id, { role: event.target.value as StaffRole })} className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"><option value="WAITER">Waiter</option><option value="COOK">Cook</option><option value="CHEF">Chef</option></select>
                  <button onClick={() => void updateStaffMember(member.id, { isActive: !member.isActive })} className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition ${member.isActive ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>{member.isActive ? "Deactivate" : "Activate"}</button>
                  <button onClick={() => { setResetPasswordStaff(member); setResetPasswordValue(""); }} aria-label={`Reset password for ${member.name}`} title="Reset password" className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100"><KeyRound className="h-4 w-4" /></button>
                  <button onClick={() => confirmDeleteStaff(member)} aria-label={`Remove ${member.name}`} title="Remove staff member" className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {resetPasswordStaff && (
        <div className="fixed inset-0 z-90 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setResetPasswordStaff(null)} />
          <div className="relative w-full max-w-sm animate-fade-in rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-bold text-gray-900">Reset password</h3>
            <p className="mb-4 text-sm text-gray-500">Set a new password for {resetPasswordStaff.name}.</p>
            <label className="field-label">New password</label>
            <input type="text" autoFocus value={resetPasswordValue} onChange={(event) => setResetPasswordValue(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void submitPasswordReset()} placeholder="Min. 8 characters, upper/lower/number/symbol" className="control-input mt-1 w-full" />
            <div className="mt-5 flex gap-3"><button onClick={() => setResetPasswordStaff(null)} className="btn-soft flex-1">Cancel</button><button onClick={() => void submitPasswordReset()} disabled={resettingPassword || !resetPasswordValue} className="btn-primary flex-1">{resettingPassword ? "Saving…" : "Update Password"}</button></div>
          </div>
        </div>
      )}

      {confirmAction && <ConfirmModal title={confirmAction.title} message={confirmAction.message} confirmLabel={confirmAction.confirmLabel} variant={confirmAction.variant} onConfirm={confirmAction.onConfirm} onCancel={() => setConfirmAction(null)} />}
    </div>
  );
}

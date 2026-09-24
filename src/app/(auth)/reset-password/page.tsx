"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import Logo from "@/components/ui/Logo";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function submit() {
    if (!token) {
      setError("This reset link is invalid. Please request a new one.");
      return;
    }
    if (!password || !confirmPassword) {
      setError("Please fill in both fields");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="glass-dark p-8 sm:p-10 !rounded-2xl">
      {!token ? (
        <>
          <h1 className="text-2xl font-bold text-white text-center mb-1">Invalid link</h1>
          <p className="text-sm text-gray-400 text-center mb-8">
            This password reset link is missing or malformed. Please request a new one.
          </p>
          <Link href="/forgot-password" className="btn-primary w-full !py-3.5 !rounded-xl !text-sm flex items-center justify-center">
            Request New Link
          </Link>
        </>
      ) : success ? (
        <>
          <h1 className="text-2xl font-bold text-white text-center mb-1">Password updated</h1>
          <p className="text-sm text-gray-400 text-center mb-8">
            Redirecting you to sign in…
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-white text-center mb-1">Reset password</h1>
          <p className="text-sm text-gray-400 text-center mb-8">Choose a new password for your account</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl mb-5 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">New password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder:text-gray-500 text-sm outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder:text-gray-500 text-sm outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition"
              />
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="btn-primary w-full !py-3.5 !rounded-xl !text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Updating...
                </span>
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8">
      <div
        className="absolute inset-0 animate-gradient pointer-events-none"
        style={{
          background: "linear-gradient(135deg, #0f0f14, #1a1025, #0f172a, #0f0f14)",
          backgroundSize: "400% 400%",
        }}
      />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-rose-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="flex items-center justify-center mb-8">
          <Logo variant="full" size={40} wordmarkClassName="text-white text-2xl" />
        </div>

        <Suspense fallback={<div className="glass-dark p-8 sm:p-10 !rounded-2xl text-center text-gray-400 text-sm">Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

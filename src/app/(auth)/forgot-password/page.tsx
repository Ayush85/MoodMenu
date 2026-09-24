"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    if (!email) {
      setError("Please enter your email");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

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

        <div className="glass-dark p-8 sm:p-10 !rounded-2xl">
          {submitted ? (
            <>
              <h1 className="text-2xl font-bold text-white text-center mb-1">Check your email</h1>
              <p className="text-sm text-gray-400 text-center mb-8">
                If an account exists for <span className="text-gray-300">{email}</span>, we&apos;ve sent a
                password reset link. It expires in 1 hour.
              </p>
              <Link href="/login" className="btn-primary w-full !py-3.5 !rounded-xl !text-sm flex items-center justify-center">
                Back to Sign In
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white text-center mb-1">Forgot password?</h1>
              <p className="text-sm text-gray-400 text-center mb-8">
                Enter your email and we&apos;ll send you a reset link
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl mb-5 text-sm animate-fade-in">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@restaurant.com"
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
                      Sending...
                    </span>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </div>

              <p className="text-center text-gray-500 text-sm mt-6">
                Remembered your password?{" "}
                <Link href="/login" className="text-orange-400 hover:text-orange-300 font-medium transition">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import Logo from "@/components/ui/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function doLogin() {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setLoading(false);
      } else {
        const session = await getSession();
        const isStaff = session?.user?.actorType === "STAFF";
        const rid = session?.user?.restaurantId || session?.user?.restaurantIds?.[0];
        if (isStaff && rid) {
          router.push(`/dashboard/restaurant/${rid}/staff`);
        } else {
          router.push("/dashboard");
        }
      }
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 animate-gradient pointer-events-none"
        style={{
          background: "linear-gradient(135deg, #0f0f14, #1a1025, #0f172a, #0f0f14)",
          backgroundSize: "400% 400%",
        }}
      />
      {/* Ambient glow */}
      <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-rose-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Logo variant="full" size={40} wordmarkClassName="text-white text-2xl" />
        </div>

        {/* Card */}
        <div className="glass-dark p-8 sm:p-10 !rounded-2xl">
          <h1 className="text-2xl font-bold text-white text-center mb-1">
            Welcome back
          </h1>
          <p className="text-sm text-gray-400 text-center mb-8">
            Sign in to your Menuor account
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl mb-5 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@restaurant.com"
                onKeyDown={(e) => e.key === "Enter" && doLogin()}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder:text-gray-500 text-sm outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  onKeyDown={(e) => e.key === "Enter" && doLogin()}
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
            <button
              type="button"
              onClick={doLogin}
              disabled={loading}
              className="btn-primary w-full !py-3.5 !rounded-xl !text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </div>

          <p className="text-center text-gray-500 text-sm mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-orange-400 hover:text-orange-300 font-medium transition">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

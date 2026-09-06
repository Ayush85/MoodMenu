"use client";

import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f0f14, #1a1025, #0f172a)",
        padding: "16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "#fff", fontSize: "18px", fontWeight: 900 }}>M</span>
            </div>
            <span style={{ fontSize: "24px", fontWeight: 700, color: "#fff" }}>
              Mood<span style={{ color: "#f97316" }}>Menu</span>
            </span>
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: "rgba(15, 15, 20, 0.8)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "20px",
            padding: "40px 32px",
          }}
        >
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#fff", textAlign: "center", marginBottom: "4px" }}>
            Welcome back
          </h1>
          <p style={{ fontSize: "14px", color: "#9ca3af", textAlign: "center", marginBottom: "32px" }}>
            Sign in to your Menuor account
          </p>

          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#fca5a5",
                padding: "12px 16px",
                borderRadius: "12px",
                marginBottom: "20px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#d1d5db", marginBottom: "6px" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@restaurant.com"
              onKeyDown={(e) => e.key === "Enter" && doLogin()}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#d1d5db", marginBottom: "6px" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              onKeyDown={(e) => e.key === "Enter" && doLogin()}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Button */}
          <button
            type="button"
            onClick={doLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              background: loading ? "#666" : "linear-gradient(135deg, #f97316, #ec4899)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 700,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p style={{ textAlign: "center", color: "#6b7280", fontSize: "14px", marginTop: "24px" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{ color: "#f97316", fontWeight: 500, textDecoration: "none" }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

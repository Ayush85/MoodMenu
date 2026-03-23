"use client";

import { useState } from "react";

export default function TestLogin() {
  const [msg, setMsg] = useState("Click the button");

  return (
    <div style={{ padding: 40, background: "#111", color: "#fff", minHeight: "100vh" }}>
      <h1>Test Page</h1>
      <p>{msg}</p>
      <button
        type="button"
        onClick={() => setMsg("Button clicked at " + new Date().toLocaleTimeString())}
        style={{ padding: "12px 24px", background: "#f97316", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 16, marginTop: 16 }}
      >
        Click Me
      </button>
    </div>
  );
}

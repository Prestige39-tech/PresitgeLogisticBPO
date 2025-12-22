"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

function supabaseBrowser() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function AgentLoginPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) return setErr(error.message);

    setMsg("Logged in ✅ Redirecting…");
    window.location.href = "/portal/clock";
  }

  return (
    <div className="grid">
      <header className="topnav">
        <div className="brand">Prestige Logistic BPO <span className="pill">MVP</span></div>
        <nav className="navlinks">
          <Link href="/apply">Apply</Link>
          <Link href="/admin/login">Admin</Link>
          <Link href="/portal/login">Agent</Link>
        </nav>
      </header>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Agent Login</h2>
        <div className="small">Use the agent email/password created when you hire them.</div>

        <div className="hr" />

        {err && <div className="error">{err}</div>}
        {msg && <div className="small">{msg}</div>}

        <form onSubmit={onSubmit} className="grid">
          <div>
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="agent@email.com" />
          </div>

          <div>
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button disabled={loading} type="submit">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>

      <footer className="footer">© 2025 Prestige Logistic BPO</footer>
    </div>
  );
}

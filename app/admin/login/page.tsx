export const dynamic = "force-dynamic";

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function AdminLogin() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin() {
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setErr(error.message);
    router.push("/admin/applications");
  }

  return (
    <div className="card grid" style={{ maxWidth: 520 }}>
      <h2 style={{ margin: 0 }}>Admin Login</h2>
      <p className="small" style={{ margin: 0 }}>
        Use your admin email/password created in Supabase Auth.
      </p>
      {err && <div className="error">{err}</div>}
      <div>
        <label>Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div>
        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </div>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button onClick={onLogin} disabled={loading || !email || !password}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </div>
  );
}

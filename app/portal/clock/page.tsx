export const dynamic = "force-dynamic";

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type TimeEntry = {
  id: string;
  agent_id: string;
  clock_in: string;
  clock_out: string | null;
};

function supabaseBrowser() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function fmt(dt: string) {
  try { return new Date(dt).toLocaleString(); } catch { return dt; }
}

export default function PortalClockPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const [current, setCurrent] = useState<TimeEntry | null>(null);

  async function load() {
    setErr(null);
    setMsg(null);
    setLoading(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        window.location.href = "/portal/login";
        return;
      }

      setEmail(user.email || "");

      const { data, error } = await supabase
        .from("time_entries")
        .select("id, agent_id, clock_in, clock_out")
        .eq("agent_id", user.id)
        .is("clock_out", null)
        .order("clock_in", { ascending: false })
        .limit(1);

      if (error) throw error;
      setCurrent((data && data[0]) || null);
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function clockIn() {
    setErr(null);
    setMsg(null);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return (window.location.href = "/portal/login");

      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          agent_id: user.id,
          clock_in: new Date().toISOString(),
          clock_out: null,
          approved: false,
        })
        .select("id, agent_id, clock_in, clock_out")
        .single();

      if (error) throw error;

      setCurrent(data as any);
      setMsg("Clocked in ✅");
    } catch (e: any) {
      setErr(e?.message || "Clock in failed");
    }
  }

  async function clockOut() {
    if (!current) return;

    setErr(null);
    setMsg(null);

    try {
      const { error } = await supabase
        .from("time_entries")
        .update({ clock_out: new Date().toISOString() })
        .eq("id", current.id);

      if (error) throw error;

      setCurrent(null);
      setMsg("Clocked out ✅");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Clock out failed");
    }
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0 }}>Agent Clock</h2>
            <div className="small">Logged in as: <strong>{email || "…"}</strong></div>
            {current?.clock_in && <div className="small">Clocked in at: {fmt(current.clock_in)}</div>}
          </div>
          <div className="row">
            <Link href="/portal/timesheet"><button className="secondary">Timesheet</button></Link>
          </div>
        </div>

        <div className="hr" />
        {err && <div className="error">{err}</div>}
        {msg && <div className="small">{msg}</div>}

        {loading ? (
          <div className="small">Loading…</div>
        ) : current ? (
          <button onClick={clockOut}>Clock Out</button>
        ) : (
          <button onClick={clockIn}>Clock In</button>
        )}

        <div className="row" style={{ justifyContent: "flex-end", marginTop: 10 }}>
          <button className="secondary" onClick={load}>Refresh</button>
        </div>
      </div>
    </div>
  );
}


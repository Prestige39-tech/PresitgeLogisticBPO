export const dynamic = "force-dynamic";

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type Row = {
  id: string;
  clock_in: string;
  clock_out: string | null;
  approved: boolean | null;
};

function supabaseBrowser() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function fmt(dt: string | null) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleString(); } catch { return dt; }
}

export default function TimesheetPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      setErr(null);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        window.location.href = "/portal/login";
        return;
      }

      setEmail(user.email || "");

      const { data, error } = await supabase
        .from("time_entries")
        .select("id, clock_in, clock_out, approved")
        .eq("agent_id", user.id)
        .order("clock_in", { ascending: false })
        .limit(200);

      if (error) setErr(error.message);
      setRows((data as any) || []);
    })();
  }, [supabase]);

  return (
    <div className="grid">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0 }}>My Timesheet</h2>
            <div className="small">Logged in as: <strong>{email}</strong></div>
          </div>
          <div className="row">
            <Link href="/portal/clock"><button className="secondary">Back to Clock</button></Link>
          </div>
        </div>

        <div className="hr" />
        {err && <div className="error">{err}</div>}

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Approved</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>{fmt(r.clock_in)}</td>
                  <td>{fmt(r.clock_out)}</td>
                  <td>{r.approved ? "✅" : "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={3} className="small">No entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



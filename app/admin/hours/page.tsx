"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type Row = {
  id: string;
  agent_id: string;
  clock_in: string;
  clock_out: string | null;
  approved: boolean;
};

function supabaseBrowser() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function isoDateOnly(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmt(dt: string | null) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleString(); } catch { return dt; }
}

function hoursBetween(a: string, b: string | null) {
  if (!b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return ms > 0 ? ms / (1000 * 60 * 60) : 0;
}

export default function AdminHoursPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return isoDateOnly(d);
  });
  const [to, setTo] = useState(() => isoDateOnly(new Date()));
  const [status, setStatus] = useState<"all" | "open" | "closed">("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);

    // inclusive range on clock_in
    const fromIso = new Date(`${from}T00:00:00.000Z`).toISOString();
    const toIso = new Date(`${to}T23:59:59.999Z`).toISOString();

    let q = supabase
      .from("time_entries")
      .select("id,agent_id,clock_in,clock_out,approved")
      .gte("clock_in", fromIso)
      .lte("clock_in", toIso)
      .order("clock_in", { ascending: false });

    if (status === "open") q = q.is("clock_out", null);
    if (status === "closed") q = q.not("clock_out", "is", null);

    const { data, error } = await q;

    if (error) {
      setErr(error.message);
      setRows([]);
      return;
    }

    setRows((data as any) || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalHours = rows.reduce((sum, r) => {
    const h = hoursBetween(r.clock_in, r.clock_out);
    return sum + (h ?? 0);
  }, 0);

  return (
    <div className="grid">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0 }}>All Agent Hours</h2>
            <div className="small">Range total: {totalHours.toFixed(2)} hours</div>
          </div>

          <div className="row">
            <Link href="/admin/agents"><button className="secondary">Agents &amp; Pay</button></Link>
            <Link href="/admin/applications"><button className="secondary">Applications</button></Link>
          </div>
        </div>

        <div className="hr" />

        <div className="grid2">
          <div>
            <label>From</label>
            <input value={from} onChange={(e) => setFrom(e.target.value)} type="date" />
          </div>
          <div>
            <label>To</label>
            <input value={to} onChange={(e) => setTo(e.target.value)} type="date" />
          </div>
        </div>

        <div className="grid2" style={{ alignItems: "end" }}>
          <div>
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="all">All</option>
              <option value="open">Open (no clock out)</option>
              <option value="closed">Closed (clocked out)</option>
            </select>
          </div>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button className="secondary" onClick={load}>Refresh</button>
          </div>
        </div>

        {err && <div className="error">{err}</div>}

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Agent ID</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Hours</th>
                <th>Approved</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const h = hoursBetween(r.clock_in, r.clock_out);
                return (
                  <tr key={r.id}>
                    <td style={{ fontFamily: "monospace" }}>{r.agent_id}</td>
                    <td>{fmt(r.clock_in)}</td>
                    <td>{fmt(r.clock_out)}</td>
                    <td>{h === null ? "—" : h.toFixed(2)}</td>
                    <td>{r.approved ? "✅" : "—"}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="small">No time entries found in this range.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="small" style={{ marginTop: 10 }}>
          Tip: open shifts show hours as “—” until clocked out.
        </div>
      </div>
    </div>
  );
}

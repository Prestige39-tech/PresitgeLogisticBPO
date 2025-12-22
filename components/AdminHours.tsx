"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Entry = any;

function iso(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function minutesBetween(startISO: string, endISO: string) {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}

export default function AdminHours() {
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 6); return iso(d); });
  const [to, setTo] = useState(() => iso(new Date()));
  const [status, setStatus] = useState("All");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [noteById, setNoteById] = useState<Record<string,string>>({});

  async function load() {
    setErr(null);
    setLoading(true);
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (status) qs.set("status", status);
    const res = await fetch(`/api/admin/time-entries?${qs.toString()}`);
    const data = await res.json();
    if (!res.ok) { setErr(data?.error || "Failed to load"); setLoading(false); return; }
    setEntries(data.entries || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => {
    let mins = 0;
    let estPay = 0;
    for (const e of entries) {
      if (!e.clock_out_at) continue;
      const netMin = Math.max(0, minutesBetween(e.clock_in_at, e.clock_out_at) - (e.break_minutes || 0));
      mins += netMin;
      const hours = netMin / 60;
      const rate = Number(e.profile?.pay_rate || 0);
      if ((e.profile?.pay_type || "hourly") === "hourly") estPay += hours * rate;
    }
    return { hours: Math.round((mins/60)*100)/100, estPay: Math.round(estPay*100)/100 };
  }, [entries]);

  async function setEntryStatus(id: string, nextStatus: "Approved"|"Rejected"|"Submitted") {
    const supervisor_note = (noteById[id] || "").trim() || undefined;
    const res = await fetch("/api/admin/time-entries/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: nextStatus, supervisor_note }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data?.error || "Update failed"); return; }
    await load();
  }

  function exportCsv() {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (status) qs.set("status", status);
    window.location.href = `/api/admin/time-entries/export?${qs.toString()}`;
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0 }}>All Agent Hours</h2>
            <div className="small">Range totals: {totals.hours} hours • Est. pay: ${totals.estPay}</div>
          </div>
          <div className="row">
            <Link href="/admin/agents"><button className="secondary">Agents & Pay</button></Link>
            <Link href="/admin/applications"><button className="secondary">Applications</button></Link>
          </div>
        </div>

        <div className="hr" />

        <div className="grid2">
          <div>
            <label>From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label>To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>

        <div className="grid2" style={{ marginTop: 10 }}>
          <div>
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option>All</option>
              <option>Submitted</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </div>
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 22 }}>
            <button className="secondary" onClick={load} disabled={loading}>Refresh</button>
            <button onClick={exportCsv}>Export CSV</button>
          </div>
        </div>

        {err && <div className="error" style={{ marginTop: 10 }}>{err}</div>}

        <div className="hr" />

        {loading ? (
          <div className="small">Loading…</div>
        ) : entries.length == 0 ? (
          <div className="small">No time entries found in this range.</div>
        ) : (
          <div className="grid" style={{ gap: 10 }}>
            {entries.map((e: any) => {
              const netMin = e.clock_out_at ? Math.max(0, minutesBetween(e.clock_in_at, e.clock_out_at) - (e.break_minutes || 0)) : 0;
              const netHours = e.clock_out_at ? Math.round((netMin / 60) * 100) / 100 : "—";
              const agent = e.profile?.full_name || e.profile?.email || e.user_id;
              const rate = Number(e.profile?.pay_rate || 0);
              const est = e.clock_out_at ? Math.round((Number(netHours) * rate) * 100) / 100 : "—";
              return (
                <div key={e.id} className="card" style={{ padding: 14 }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <strong>{e.work_date} • {agent}</strong>
                    <span className="badge">{e.status}</span>
                  </div>
                  <div className="small">
                    In: {new Date(e.clock_in_at).toLocaleTimeString()} • Out: {e.clock_out_at ? new Date(e.clock_out_at).toLocaleTimeString() : "—"}
                    • Break: {e.break_minutes || 0}m • Net: {netHours}h
                  </div>
                  <div className="small">
                    {e.campaign ? `Campaign: ${e.campaign} • ` : ""}{e.task_code ? `Task: ${e.task_code} • ` : ""}Rate: ${rate}/hr • Est: {est === "—" ? "—" : `$${est}`}
                  </div>
                  {e.end_of_shift_note && <div className="small">Note: {e.end_of_shift_note}</div>}

                  <div className="grid2" style={{ marginTop: 10 }}>
                    <div>
                      <label>Supervisor note (optional)</label>
                      <input
                        value={noteById[e.id] ?? (e.supervisor_note || "")}
                        onChange={ev => setNoteById(prev => ({ ...prev, [e.id]: ev.target.value }))}
                        placeholder="Reason if rejected, etc."
                      />
                    </div>
                    <div className="row" style={{ justifyContent: "flex-end", marginTop: 22 }}>
                      <button className="secondary" onClick={() => setEntryStatus(e.id, "Approved")}>Approve</button>
                      <button className="secondary" onClick={() => setEntryStatus(e.id, "Rejected")}>Reject</button>
                      <button className="secondary" onClick={() => setEntryStatus(e.id, "Submitted")}>Reset</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="small">
        Tip: Contractors must clock out to calculate net hours. Open shifts show net as “—”.
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Agent = any;
type Occ = any;

const TYPES = [
  "Late",
  "Call Out",
  "No Call No Show",
  "Early Logout",
  "Coaching",
  "Warning",
  "Other",
];

function iso(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AdminOccurrences() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [occurrences, setOccurrences] = useState<Occ[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // filters
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return iso(d); });
  const [to, setTo] = useState(() => iso(new Date()));
  const [filterAgent, setFilterAgent] = useState<string>("All");
  const [filterType, setFilterType] = useState<string>("All");

  // create form
  const [userId, setUserId] = useState<string>("");
  const [date, setDate] = useState<string>(() => iso(new Date()));
  const [type, setType] = useState<string>("Late");
  const [points, setPoints] = useState<number | "">("");
  const [notes, setNotes] = useState<string>("");

  async function loadAgents() {
    const res = await fetch("/api/admin/agents");
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load agents");
    setAgents(data.agents || []);
    if (!userId && data.agents?.[0]?.user_id) setUserId(data.agents[0].user_id);
  }

  async function loadOccurrences() {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (filterAgent && filterAgent !== "All") qs.set("user_id", filterAgent);
    if (filterType && filterType !== "All") qs.set("type", filterType);

    const res = await fetch(`/api/admin/occurrences?${qs.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load occurrences");
    setOccurrences(data.occurrences || []);
  }

  async function loadAll() {
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      await loadAgents();
      await loadOccurrences();
    } catch (e: any) {
      setErr(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function createOccurrence() {
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/occurrences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        occurrence_date: date,
        occurrence_type: type,
        points: points === "" ? 0 : Number(points),
        notes,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data?.error || "Create failed"); return; }
    setMsg("Occurrence added ✅");
    setNotes("");
    setPoints("");
    await loadOccurrences();
  }

  const agentLabel = useMemo(() => {
    const map = new Map<string, string>();
    agents.forEach(a => map.set(a.user_id, a.full_name || a.email || a.user_id));
    return map;
  }, [agents]);

  return (
    <div className="grid">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0 }}>Occurrences (Attendance)</h2>
            <div className="small">Option A: agents do NOT see occurrences. Admin-only.</div>
          </div>
          <div className="row">
            <Link href="/admin/hours"><button className="secondary">All Hours</button></Link>
            <Link href="/admin/agents"><button className="secondary">Agents & Pay</button></Link>
            <Link href="/admin/applications"><button className="secondary">Applications</button></Link>
          </div>
        </div>

        <div className="hr" />

        {err && <div className="error">{err}</div>}
        {msg && <div className="small">{msg}</div>}

        <div className="card" style={{ padding: 14 }}>
          <strong>Add Occurrence</strong>
          <div className="grid2" style={{ marginTop: 10 }}>
            <div>
              <label>Agent</label>
              <select value={userId} onChange={e => setUserId(e.target.value)}>
                {agents.map(a => (
                  <option key={a.user_id} value={a.user_id}>
                    {a.full_name || a.email || a.user_id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          <div className="grid2" style={{ marginTop: 10 }}>
            <div>
              <label>Type</label>
              <select value={type} onChange={e => setType(e.target.value)}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label>Points (optional)</label>
              <input type="number" value={points as any} onChange={e => setPoints(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g., 1" />
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <label>Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason/details..." />
          </div>

          <div className="row" style={{ justifyContent: "flex-end", marginTop: 10 }}>
            <button onClick={createOccurrence} disabled={!userId || !date || !type}>Add</button>
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
            <label>Filter Agent</label>
            <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
              <option value="All">All</option>
              {agents.map(a => (
                <option key={a.user_id} value={a.user_id}>
                  {a.full_name || a.email || a.user_id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Filter Type</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="All">All</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="row" style={{ justifyContent: "flex-end", marginTop: 10 }}>
          <button className="secondary" onClick={loadOccurrences} disabled={loading}>Refresh</button>
        </div>

        <div className="hr" />

        {loading ? (
          <div className="small">Loading…</div>
        ) : occurrences.length === 0 ? (
          <div className="small">No occurrences in this range.</div>
        ) : (
          <div className="grid" style={{ gap: 10 }}>
            {occurrences.map(o => (
              <div key={o.id} className="card" style={{ padding: 14 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{o.occurrence_date} • {agentLabel.get(o.user_id) || o.profile?.email || o.user_id}</strong>
                  <span className="badge">{o.occurrence_type}</span>
                </div>
                <div className="small">Points: {o.points ?? 0}</div>
                {o.notes && <div className="small">Notes: {o.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

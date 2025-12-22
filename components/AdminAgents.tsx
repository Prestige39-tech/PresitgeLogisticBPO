"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Agent = any;

export default function AdminAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setMsg(null);
    setLoading(true);
    const res = await fetch("/api/admin/agents");
    const data = await res.json();
    if (!res.ok) { setErr(data?.error || "Failed to load"); setLoading(false); return; }
    setAgents(data.agents || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save(agent: Agent) {
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/agents/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: agent.user_id,
        pay_rate: Number(agent.pay_rate || 0),
        pay_type: agent.pay_type || "hourly",
        is_active: !!agent.is_active,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data?.error || "Save failed"); return; }
    setMsg("Saved ✅");
    await load();
  }

  function setAgent(idx: number, patch: any) {
    setAgents(prev => prev.map((a, i) => i === idx ? { ...a, ...patch } : a));
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0 }}>Agents & Pay Rates</h2>
            <div className="small">Set hourly pay rate per agent (used in Admin Hours totals + CSV export).</div>
          </div>
          <div className="row">
            <Link href="/admin/hours"><button className="secondary">All Hours</button></Link>
            <Link href="/admin/applications"><button className="secondary">Applications</button></Link>
          </div>
        </div>

        <div className="hr" />

        {err && <div className="error">{err}</div>}
        {msg && <div className="small">{msg}</div>}

        {loading ? (
          <div className="small">Loading…</div>
        ) : agents.length === 0 ? (
          <div className="small">No agents yet. Hire an applicant to create their login automatically.</div>
        ) : (
          <div className="grid" style={{ gap: 10 }}>
            {agents.map((ag, idx) => (
              <div key={ag.user_id} className="card" style={{ padding: 14 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{ag.full_name || ag.email || ag.user_id}</strong>
                  <span className="badge">{ag.is_active ? "Active" : "Inactive"}</span>
                </div>
                <div className="small">{ag.email || "—"}{ag.phone ? ` • ${ag.phone}` : ""}</div>

                <div className="grid2" style={{ marginTop: 10 }}>
                  <div>
                    <label>Pay type</label>
                    <select value={ag.pay_type || "hourly"} onChange={e => setAgent(idx, { pay_type: e.target.value })}>
                      <option value="hourly">Hourly</option>
                    </select>
                  </div>
                  <div>
                    <label>Pay rate (per hour)</label>
                    <input
                      type="number"
                      value={ag.pay_rate ?? 0}
                      onChange={e => setAgent(idx, { pay_rate: e.target.value === "" ? 0 : Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid2" style={{ marginTop: 10 }}>
                  <div>
                    <label>Active</label>
                    <select value={ag.is_active ? "yes" : "no"} onChange={e => setAgent(idx, { is_active: e.target.value === "yes" })}>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <div className="small">Use this as your internal active/inactive switch.</div>
                  </div>
                  <div className="row" style={{ justifyContent: "flex-end", marginTop: 22 }}>
                    <button onClick={() => save(ag)}>Save</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

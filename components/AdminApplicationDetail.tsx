"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const STATUSES = ["Submitted", "Review", "Interview", "Offer", "Hired", "Rejected"] as const;

export default function AdminApplicationDetail({ application, files, references }: any) {
  const supabase = supabaseBrowser();
  const [status, setStatus] = useState(application.status);
  const [notes, setNotes] = useState(application.admin_notes || "");
  const [saving, setSaving] = useState(false);
  const [hiring, setHiring] = useState(false);
  const [payRate, setPayRate] = useState<number | "">("");
  const [msg, setMsg] = useState<string | null>(null);

  const fileMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const f of files) m[f.file_type] = f;
    return m;
  }, [files]);

  async function signedUrl(storage_path: string) {
    const { data, error } = await supabase.storage
      .from("applications")
      .createSignedUrl(storage_path, 60 * 15); // 15 minutes
    if (error) throw new Error(error.message);
    return data.signedUrl;
  }

  // ✅ FIXED: Creates a temporary link and clicks it (bypasses popup blockers)
  async function openFile(fileType: string) {
    setMsg(null);
    try {
      const f = fileMap[fileType];
      if (!f) {
        setMsg(`No ${fileType} file found.`);
        return;
      }
      
      const url = await signedUrl(f.storage_path);
      
      // Create temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // Trigger click
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (e: any) {
      setMsg(e?.message || "Could not open file");
    }
  }

async function hireAndCreateLogin() {
  setMsg(null);
  setHiring(true);
  try {
    const res = await fetch("/api/admin/hire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_id: application.id,
        pay_rate: payRate === "" ? undefined : Number(payRate),
        pay_type: "hourly",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Hire failed");
    setMsg("Hired ✅ Invite email sent to agent.");
    setStatus("Hired");
  } catch (e: any) {
    setMsg(e?.message || "Hire failed");
  } finally {
    setHiring(false);
  }
}

async function save() {
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from("applications")
      .update({ status, admin_notes: notes })
      .eq("id", application.id);
    setSaving(false);
    if (error) return setMsg(error.message);
    setMsg("Saved ✅");
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0 }}>{application.full_name}</h2>
            <div className="small">{application.email} · {application.phone}</div>
            <div className="small">Submitted: {new Date(application.created_at).toLocaleString()}</div>
          </div>
          <span className="badge">{application.status}</span>
        </div>

        <div className="hr" />

        <div className="grid2">
          <div>
            <label>Agent pay rate (hourly) (optional)</label>
            <input type="number" value={payRate as any} onChange={(e) => setPayRate(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g., 4.50" />
          </div>

          <div className="card" style={{ padding: 14 }}>
            <strong>Applicant Info</strong>
            <div className="small">Age: {application.age}</div>
            <div className="small">Address: {application.home_address}</div>
            <div className="small">Education: {application.education_level}</div>
            {application.education_results && <div className="small">Education results: {application.education_results}</div>}
            <div className="small">Experience: {application.has_call_center_experience ? "Yes" : "No"}</div>
            {application.comments && <div className="small">Comments: {application.comments}</div>}
          </div>

          <div className="card" style={{ padding: 14 }}>
            <strong>Internet Speed</strong>
            <div className="small">Download: {application.speed_download_mbps} Mbps</div>
            <div className="small">Upload: {application.speed_upload_mbps} Mbps</div>
            <div className="small">Ping: {application.speed_ping_ms ?? "N/A"} ms</div>
            <div className="hr" />
            <div className="row">
              <button className="secondary" onClick={() => openFile("speedtest_screenshot")}>Open speedtest screenshot</button>
            </div>
          </div>
        </div>

        <div className="hr" />

        <div className="card" style={{ padding: 14 }}>
          <strong>Files</strong>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="secondary" onClick={() => openFile("resume")}>Open resume</button>
            <button className="secondary" onClick={() => openFile("pc_specs_screenshot")}>Open PC specs screenshot</button>
          </div>
        </div>

        <div className="hr" />

        <div className="card" style={{ padding: 14 }}>
          <strong>References</strong>
          <div className="hr" />
          {(references || []).map((r: any) => (
            <div key={r.id} className="grid" style={{ marginBottom: 10 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{r.ref_name}</strong>
                <span className="badge">{r.relationship}</span>
              </div>
              <div className="small">{r.ref_phone}{r.ref_email ? ` · ${r.ref_email}` : ""}</div>
            </div>
          ))}
          {(!references || references.length === 0) && <div className="small">No references found.</div>}
        </div>

        <div className="hr" />

        <div className="grid2">
          <div>
            <label>Agent pay rate (hourly) (optional)</label>
            <input type="number" value={payRate as any} onChange={(e) => setPayRate(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g., 4.50" />
          </div>

          <div>
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label>Admin Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes" />
          </div>
        </div>

        <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
          {status !== "Hired" && (
            <button className="secondary" onClick={hireAndCreateLogin} disabled={hiring}>
              {hiring ? "Hiring..." : "Hire & Create Login"}
            </button>
          )}
          <button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        </div>

        {msg && <div className="small" style={{ marginTop: 10 }}>{msg}</div>}
      </div>
    </div>
  );
}

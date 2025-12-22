"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Ref = { name: string; relationship: string; phone: string; email?: string };

const MAX_MB = 10;

function mb(n: number) { return Math.round((n / (1024 * 1024)) * 10) / 10; }

export default function ApplicationForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [educationLevel, setEducationLevel] = useState("");
  const [educationResults, setEducationResults] = useState("");
  const [hasExp, setHasExp] = useState<boolean | null>(null);
  const [comments, setComments] = useState("");

  const [download, setDownload] = useState<number | "">("");
  const [upload, setUpload] = useState<number | "">("");
  const [ping, setPing] = useState<number | "">("");

  const [resume, setResume] = useState<File | null>(null);
  const [speedShot, setSpeedShot] = useState<File | null>(null);
  const [pcSpec, setPcSpec] = useState<File | null>(null);

  const [refs, setRefs] = useState<Ref[]>([
    { name: "", relationship: "", phone: "", email: "" },
    { name: "", relationship: "", phone: "", email: "" },
  ]);

  const speedOk = useMemo(() => {
    const d = typeof download === "number" ? download : NaN;
    const u = typeof upload === "number" ? upload : NaN;
    return Number.isFinite(d) && Number.isFinite(u) && d >= 100 && u >= 100;
  }, [download, upload]);

  function validateFile(f: File | null, label: string) {
    if (!f) return `${label} is required.`;
    if (f.size > MAX_MB * 1024 * 1024) return `${label} must be <= ${MAX_MB}MB (yours is ${mb(f.size)}MB).`;
    return null;
  }

  const canSubmit = useMemo(() => {
    if (!fullName.trim()) return false;
    if (!email.trim()) return false;
    if (!phone.trim()) return false;
    if (!homeAddress.trim()) return false;
    if (typeof age !== "number" || age < 18) return false;
    if (!educationLevel.trim()) return false;
    if (hasExp === null) return false;
    if (!speedOk) return false;
    if (!resume || !speedShot || !pcSpec) return false;
    if (refs.length < 2) return false;
    for (const r of refs.slice(0, 2)) {
      if (!r.name.trim() || !r.relationship.trim() || !r.phone.trim()) return false;
    }
    return true;
  }, [fullName, email, phone, homeAddress, age, educationLevel, hasExp, speedOk, resume, speedShot, pcSpec, refs]);

  async function onSubmit() {
    setErr(null);

    const fileErr =
      validateFile(resume, "Resume") ||
      validateFile(speedShot, "Speedtest screenshot") ||
      validateFile(pcSpec, "PC specs screenshot");

    if (fileErr) { setErr(fileErr); return; }
    if (!speedOk) { setErr("Speed test must be at least 100 Mbps download and 100 Mbps upload."); return; }

    setSubmitting(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        home_address: homeAddress.trim(),
        age: age as number,
        education_level: educationLevel.trim(),
        education_results: educationResults.trim() || undefined,
        has_call_center_experience: hasExp as boolean,
        comments: comments.trim() || undefined,
        speed_download_mbps: Number(download),
        speed_upload_mbps: Number(upload),
        speed_ping_ms: ping === "" ? undefined : Number(ping),
        references: refs.slice(0, 2).map(r => ({
          name: r.name.trim(),
          relationship: r.relationship.trim(),
          phone: r.phone.trim(),
          email: (r.email || "").trim() || undefined,
        })),
      };

      const fd = new FormData();
      fd.set("payload", JSON.stringify(payload));
      fd.set("resume", resume!);
      fd.set("speedtest_screenshot", speedShot!);
      fd.set("pc_specs_screenshot", pcSpec!);

      const res = await fetch("/api/apply", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to submit");
      router.push("/apply/success");
    } catch (e: any) {
      setErr(e?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid">
      {err && <div className="error">{err}</div>}

      <div className="grid2">
        <div>
          <label>Full Name (First and Last) *</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" />
        </div>
        <div>
          <label>Email Address *</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@email.com" />
        </div>
      </div>

      <div className="grid2">
        <div>
          <label>Phone Number (include country code) *</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+592 6XX XXXX" />
        </div>
        <div>
          <label>Age (must be 18+) *</label>
          <input type="number" value={age} onChange={e => setAge(e.target.value === "" ? "" : Number(e.target.value))} />
        </div>
      </div>

      <div>
        <label>Home Address *</label>
        <textarea value={homeAddress} onChange={e => setHomeAddress(e.target.value)} placeholder="Full residential address" />
      </div>

      <div className="grid2">
        <div>
          <label>Highest Level of Education *</label>
          <input value={educationLevel} onChange={e => setEducationLevel(e.target.value)} placeholder="e.g., High School Diploma, Associate’s, Bachelor’s" />
        </div>
        <div>
          <label>Education Results (optional)</label>
          <input value={educationResults} onChange={e => setEducationResults(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      <div className="grid2">
        <div>
          <label>Call Center / Customer Service Experience? *</label>
          <select value={hasExp === null ? "" : hasExp ? "yes" : "no"} onChange={e => setHasExp(e.target.value === "" ? null : e.target.value === "yes")}>
            <option value="">Select…</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div>
          <label>Comments (optional)</label>
          <input value={comments} onChange={e => setComments(e.target.value)} placeholder="Anything you'd like us to know" />
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>Internet Speed Verification (Required)</strong>
          <span className="badge">{speedOk ? "Meets 100/100 ✅" : "Must be 100/100"}</span>
        </div>
        <p className="small" style={{ marginTop: 8 }}>
          Run a test at speedtest.net and upload a screenshot. Enter your results below.
        </p>
        <div className="grid2">
          <div>
            <label>Download (Mbps) *</label>
            <input type="number" value={download} onChange={e => setDownload(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <div>
            <label>Upload (Mbps) *</label>
            <input type="number" value={upload} onChange={e => setUpload(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
        </div>
        <div className="grid2">
          <div>
            <label>Ping (ms) (optional)</label>
            <input type="number" value={ping} onChange={e => setPing(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <div>
            <label>Speedtest Screenshot (JPG/PNG/PDF, max 10MB) *</label>
            <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setSpeedShot(e.target.files?.[0] || null)} />
            {speedShot && <div className="small">Selected: {speedShot.name} ({mb(speedShot.size)}MB)</div>}
          </div>
        </div>
      </div>

      <div className="grid2">
        <div>
          <label>Resume (PDF/DOC/DOCX, max 10MB) *</label>
          <input type="file" accept=".pdf,.doc,.docx" onChange={e => setResume(e.target.files?.[0] || null)} />
          {resume && <div className="small">Selected: {resume.name} ({mb(resume.size)}MB)</div>}
        </div>
        <div>
          <label>PC Specs Screenshot (JPG/PNG/PDF, max 10MB) *</label>
          <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setPcSpec(e.target.files?.[0] || null)} />
          {pcSpec && <div className="small">Selected: {pcSpec.name} ({mb(pcSpec.size)}MB)</div>}
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>References (2 required)</strong>
          <span className="badge">Minimum 2</span>
        </div>
        <div className="hr" />
        {refs.slice(0,2).map((r, idx) => (
          <div key={idx} className="grid" style={{ marginBottom: 14 }}>
            <strong>Reference {idx + 1}</strong>
            <div className="grid2">
              <div>
                <label>Name *</label>
                <input value={r.name} onChange={e => {
                  const next = [...refs]; next[idx] = { ...next[idx], name: e.target.value }; setRefs(next);
                }} />
              </div>
              <div>
                <label>Relationship *</label>
                <input value={r.relationship} onChange={e => {
                  const next = [...refs]; next[idx] = { ...next[idx], relationship: e.target.value }; setRefs(next);
                }} placeholder="Supervisor, colleague, etc." />
              </div>
            </div>
            <div className="grid2">
              <div>
                <label>Phone *</label>
                <input value={r.phone} onChange={e => {
                  const next = [...refs]; next[idx] = { ...next[idx], phone: e.target.value }; setRefs(next);
                }} placeholder="+592..." />
              </div>
              <div>
                <label>Email (optional)</label>
                <input value={r.email || ""} onChange={e => {
                  const next = [...refs]; next[idx] = { ...next[idx], email: e.target.value }; setRefs(next);
                }} placeholder="name@email.com" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button disabled={!canSubmit || submitting} onClick={onSubmit}>
          {submitting ? "Submitting..." : "Submit Application"}
        </button>
      </div>

      {!canSubmit && (
        <div className="small">
          Tip: You must meet <b>100/100</b> speeds, upload all 3 files, and provide 2 references to submit.
        </div>
      )}
    </div>
  );
}

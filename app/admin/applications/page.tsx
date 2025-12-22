import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/admin";

export default async function AdminApplications() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");
  if (!isAdminEmail(user.email)) redirect("/");

  const { data, error } = await supabase
    .from("applications")
    .select("id, full_name, email, phone, status, speed_download_mbps, speed_upload_mbps, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return <div className="card error">Failed to load applications: {error.message}</div>;
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Applications</h2>
          <span className="badge">{data?.length || 0} total</span>
        </div>
        <div className="hr" />
        <div className="grid" style={{ gap: 10 }}>
          {(data || []).map((a: any) => (
            <Link key={a.id} href={`/admin/applications/${a.id}`} className="card" style={{ padding: 14 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{a.full_name}</strong>
                <span className="badge">{a.status}</span>
              </div>
              <div className="small">{a.email} · {a.phone}</div>
              <div className="small">Speed: {a.speed_download_mbps}/{a.speed_upload_mbps} Mbps · Submitted: {new Date(a.created_at).toLocaleString()}</div>
            </Link>
          ))}
          {(!data || data.length === 0) && <div className="small">No applications yet.</div>}
        </div>
      </div>
    </div>
  );
}

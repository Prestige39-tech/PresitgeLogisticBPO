import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/admin";
import AdminApplicationDetail from "@/components/AdminApplicationDetail";

export default async function AdminAppDetailPage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  if (!isAdminEmail(user.email)) redirect("/");

  const id = params.id;

  const { data: app, error: appErr } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .single();

  if (appErr) return <div className="card error">Unable to load application: {appErr.message}</div>;

  const { data: files } = await supabase
    .from("application_files")
    .select("*")
    .eq("application_id", id);

  const { data: refs } = await supabase
    .from("application_references")
    .select("*")
    .eq("application_id", id);

  return <AdminApplicationDetail application={app} files={files || []} references={refs || []} />;
}

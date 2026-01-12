import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/admin";
import AdminApplicationDetail from "@/components/AdminApplicationDetail";

export default async function AdminAppDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = supabaseServer();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  if (!isAdminEmail(user.email)) redirect("/");

  const id = params.id;

  // Load application
  const { data: app, error: appErr } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .single();

  if (appErr) {
    return (
      <div className="card error">
        Unable to load application: {appErr.message}
      </div>
    );
  }

  // Load files
  const { data: files } = await supabase
    .from("application_files")
    .select("*")
    .eq("application_id", id);

  // Load references
  const { data: refs } = await supabase
    .from("application_references")
    .select("*")
    .eq("application_id", id);

  // 🔑 FIND RESUME + CREATE SIGNED URL
  const resume = (files || []).find(
    (f: any) => f.file_type === "resume" && f.storage_path
  );

  let resumeUrl: string | null = null;

  if (resume?.storage_path) {
    const { data: signed, error } = await supabase.storage
      .from("applications") // bucket name
      .createSignedUrl(resume.storage_path, 60 * 5); // 5 minutes

    if (!error) {
      resumeUrl = signed?.signedUrl ?? null;
    }
  }

  // Render page
  return (
    <AdminApplicationDetail
      application={app}
      files={files || []}
      references={refs || []}
      resumeUrl={resumeUrl}
    />
  );
}

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/admin";
import AdminAgents from "@/components/AdminAgents";

export default async function AdminAgentsPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  if (!isAdminEmail(user.email)) redirect("/");
  return <AdminAgents />;
}

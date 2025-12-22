import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/admin";
import AdminOccurrences from "@/components/AdminOccurrences";

export default async function AdminOccurrencesPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  if (!isAdminEmail(user.email)) redirect("/");
  return <AdminOccurrences />;
}

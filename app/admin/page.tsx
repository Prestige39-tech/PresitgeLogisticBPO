import { redirect } from "next/navigation";

export default function AdminIndex() {
  redirect("/admin/login"); // or "/admin/applications" if you prefer
}

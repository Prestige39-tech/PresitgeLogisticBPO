import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BodySchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["Submitted","Approved","Rejected"]),
  supervisor_note: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const supa = supabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const body = BodySchema.parse(await req.json());
    const admin = supabaseAdmin();

    const { error } = await admin
      .from("time_entries")
      .update({ status: body.status, supervisor_note: body.supervisor_note || null })
      .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 400 });
  }
}

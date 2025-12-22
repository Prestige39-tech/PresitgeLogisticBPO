import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const QuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const supa = supabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const url = new URL(req.url);
    const parsed = QuerySchema.parse({
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
      status: url.searchParams.get("status") || undefined,
    });

    const admin = supabaseAdmin();

    let q = admin
      .from("time_entries")
      .select("id, user_id, work_date, clock_in_at, clock_out_at, break_minutes, campaign, task_code, end_of_shift_note, status, supervisor_note, created_at")
      .order("work_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (parsed.from) q = q.gte("work_date", parsed.from);
    if (parsed.to) q = q.lte("work_date", parsed.to);
    if (parsed.status && parsed.status !== "All") q = q.eq("status", parsed.status);

    const { data: entries, error: eErr } = await q;
    if (eErr) return NextResponse.json({ error: eErr.message }, { status: 400 });

    const userIds = Array.from(new Set((entries || []).map((e: any) => e.user_id)));
    const { data: profs, error: pErr } = await admin
      .from("contractor_profiles")
      .select("user_id, full_name, email, pay_type, pay_rate, is_active")
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

    const map = new Map<string, any>();
    (profs || []).forEach((p: any) => map.set(p.user_id, p));

    const enriched = (entries || []).map((e: any) => ({ ...e, profile: map.get(e.user_id) || null }));
    return NextResponse.json({ ok: true, entries: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 400 });
  }
}

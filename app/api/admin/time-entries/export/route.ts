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

function minutesBetween(startISO: string, endISO: string) {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}

export async function GET(req: Request) {
  try {
    const supa = supabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return new NextResponse("Not authenticated", { status: 401 });
    if (!isAdminEmail(user.email)) return new NextResponse("Not authorized", { status: 403 });

    const url = new URL(req.url);
    const parsed = QuerySchema.parse({
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
      status: url.searchParams.get("status") || undefined,
    });

    const admin = supabaseAdmin();

    let q = admin
      .from("time_entries")
      .select("id, user_id, work_date, clock_in_at, clock_out_at, break_minutes, campaign, task_code, status")
      .order("work_date", { ascending: false });

    if (parsed.from) q = q.gte("work_date", parsed.from);
    if (parsed.to) q = q.lte("work_date", parsed.to);
    if (parsed.status && parsed.status !== "All") q = q.eq("status", parsed.status);

    const { data: entries, error: eErr } = await q;
    if (eErr) return new NextResponse(eErr.message, { status: 400 });

    const userIds = Array.from(new Set((entries || []).map((e: any) => e.user_id)));
    const { data: profs, error: pErr } = await admin
      .from("contractor_profiles")
      .select("user_id, full_name, email, pay_type, pay_rate")
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

    if (pErr) return new NextResponse(pErr.message, { status: 400 });

    const map = new Map<string, any>();
    (profs || []).forEach((p: any) => map.set(p.user_id, p));

    const header = [
      "work_date","agent_name","agent_email","clock_in_at","clock_out_at","break_minutes","net_hours","status","campaign","task_code","pay_type","pay_rate","estimated_pay"
    ];

    const rows: string[] = [];
    rows.push(header.join(","));

    for (const e of (entries || [] as any[])) {
      const prof = map.get(e.user_id) || {};
      const netMin = e.clock_out_at ? Math.max(0, minutesBetween(e.clock_in_at, e.clock_out_at) - (e.break_minutes || 0)) : 0;
      const netHours = Math.round((netMin / 60) * 100) / 100;
      const payRate = Number(prof.pay_rate || 0);
      const estPay = (prof.pay_type || "hourly") === "hourly" ? Math.round(netHours * payRate * 100) / 100 : "";
      const vals = [
        e.work_date,
        (prof.full_name || "").replaceAll(",", " "),
        (prof.email || "").replaceAll(",", " "),
        e.clock_in_at,
        e.clock_out_at || "",
        String(e.break_minutes || 0),
        String(netHours),
        e.status,
        (e.campaign || "").replaceAll(",", " "),
        (e.task_code || "").replaceAll(",", " "),
        prof.pay_type || "hourly",
        String(payRate),
        String(estPay),
      ].map(v => `"${String(v).replaceAll('"', '""')}"`);
      rows.push(vals.join(","));
    }

    const csv = rows.join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=agent_hours.csv",
      },
    });
  } catch (e: any) {
    return new NextResponse(e?.message || "Unknown error", { status: 400 });
  }
}

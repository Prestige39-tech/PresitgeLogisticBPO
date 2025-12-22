import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const GetQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  user_id: z.string().uuid().optional(),
  type: z.string().optional(),
});

const CreateSchema = z.object({
  user_id: z.string().uuid(),
  occurrence_date: z.string(), // YYYY-MM-DD
  occurrence_type: z.string(),
  points: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const supa = supabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const url = new URL(req.url);
    const parsed = GetQuerySchema.parse({
      from: url.searchParams.get("from") || undefined,
      to: url.searchParams.get("to") || undefined,
      user_id: url.searchParams.get("user_id") || undefined,
      type: url.searchParams.get("type") || undefined,
    });

    const admin = supabaseAdmin();

    let q = admin
      .from("occurrences")
      .select("id, user_id, occurrence_date, occurrence_type, points, notes, created_by, created_at")
      .order("occurrence_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (parsed.from) q = q.gte("occurrence_date", parsed.from);
    if (parsed.to) q = q.lte("occurrence_date", parsed.to);
    if (parsed.user_id) q = q.eq("user_id", parsed.user_id);
    if (parsed.type && parsed.type !== "All") q = q.eq("occurrence_type", parsed.type);

    const { data: occs, error: oErr } = await q;
    if (oErr) return NextResponse.json({ error: oErr.message }, { status: 400 });

    const userIds = Array.from(new Set((occs || []).map((o: any) => o.user_id)));
    const { data: profs, error: pErr } = await admin
      .from("contractor_profiles")
      .select("user_id, full_name, email, is_active")
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

    const map = new Map<string, any>();
    (profs || []).forEach((p: any) => map.set(p.user_id, p));

    const enriched = (occs || []).map((o: any) => ({ ...o, profile: map.get(o.user_id) || null }));
    return NextResponse.json({ ok: true, occurrences: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const supa = supabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const body = CreateSchema.parse(await req.json());
    const admin = supabaseAdmin();

    const { error } = await admin.from("occurrences").insert({
      user_id: body.user_id,
      occurrence_date: body.occurrence_date,
      occurrence_type: body.occurrence_type,
      points: body.points ?? 0,
      notes: body.notes?.trim() || null,
      created_by: user.id,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 400 });
  }
}

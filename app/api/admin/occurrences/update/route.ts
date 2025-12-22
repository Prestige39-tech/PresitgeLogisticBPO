import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BodySchema = z.object({
  id: z.string().uuid(),
  occurrence_date: z.string().optional(),
  occurrence_type: z.string().optional(),
  points: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const supa = supabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const body = BodySchema.parse(await req.json());
    const admin = supabaseAdmin();

    const patch: any = {};
    if (body.occurrence_date) patch.occurrence_date = body.occurrence_date;
    if (body.occurrence_type) patch.occurrence_type = body.occurrence_type;
    if (typeof body.points === "number") patch.points = body.points;
    if (typeof body.notes === "string") patch.notes = body.notes.trim() || null;

    const { error } = await admin.from("occurrences").update(patch).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 400 });
  }
}

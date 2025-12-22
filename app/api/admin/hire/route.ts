import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BodySchema = z.object({
  application_id: z.string().uuid(),
  pay_rate: z.number().nonnegative().optional(),
  pay_type: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const supa = supabaseServer();
    const { data: { user }, error: uErr } = await supa.auth.getUser();
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 401 });
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const body = BodySchema.parse(await req.json());

    const { data: app, error: appErr } = await supa
      .from("applications")
      .select("id, full_name, email, phone, status")
      .eq("id", body.application_id)
      .single();

    if (appErr) return NextResponse.json({ error: appErr.message }, { status: 400 });
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const admin = supabaseAdmin();

    const { data: invite, error: invErr } = await admin.auth.admin.inviteUserByEmail(app.email, {
      data: { role: "contractor" },
    });

    if (invErr) return NextResponse.json({ error: invErr.message }, { status: 400 });

    const newUserId = invite?.user?.id;
    if (!newUserId) return NextResponse.json({ error: "Invite succeeded but no user id returned" }, { status: 500 });

    const { error: profErr } = await admin.from("contractor_profiles").upsert({
      user_id: newUserId,
      full_name: app.full_name,
      email: app.email,
      phone: app.phone,
      is_active: true,
      pay_type: body.pay_type || "hourly",
      pay_rate: body.pay_rate ?? 0,
    });

    if (profErr) return NextResponse.json({ error: profErr.message }, { status: 400 });

    const { error: upErr } = await supa.from("applications").update({ status: "Hired" }).eq("id", app.id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, user_id: newUserId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 400 });
  }
}

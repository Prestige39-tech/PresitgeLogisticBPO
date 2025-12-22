import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BodySchema = z.object({
  user_id: z.string().uuid(),
  pay_rate: z.number().nonnegative(),
  pay_type: z.string().default("hourly"),
  is_active: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const supa = supabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (!isAdminEmail(user.email)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const body = BodySchema.parse(await req.json());
    const admin = supabaseAdmin();

    const patch: any = { pay_rate: body.pay_rate, pay_type: body.pay_type };
    if (typeof body.is_active === "boolean") patch.is_active = body.is_active;

    const { error } = await admin
      .from("contractor_profiles")
      .update(patch)
      .eq("user_id", body.user_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 400 });
  }
}

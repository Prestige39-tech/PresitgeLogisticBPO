import { NextResponse } from "next/server";
import { z } from "zod";

// ---- Validation ----
const RefSchema = z.object({
  name: z.string().min(2),
  relationship: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
});

const BodySchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  home_address: z.string().min(10),
  age: z.number().int().min(18),
  education_level: z.string().min(2),
  education_results: z.string().optional(),
  has_call_center_experience: z.boolean(),
  comments: z.string().optional(),
  speed_download_mbps: z.number().min(100),
  speed_upload_mbps: z.number().min(100),
  speed_ping_ms: z.number().optional(),
  references: z.array(RefSchema).min(2),
});

export async function POST(req: Request) {
  try {
    // ---- Parse multipart form ----
    const form = await req.formData();

    const payloadRaw = form.get("payload");
    if (!payloadRaw || typeof payloadRaw !== "string") {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }

    const parsed = BodySchema.parse(JSON.parse(payloadRaw));

    const resume = form.get("resume");
    const speedshot = form.get("speedtest_screenshot");
    const pcspec = form.get("pc_specs_screenshot");

    if (!(resume instanceof File)) {
      return NextResponse.json({ error: "Resume is required" }, { status: 400 });
    }
    if (!(speedshot instanceof File)) {
      return NextResponse.json({ error: "Speedtest screenshot is required" }, { status: 400 });
    }
    if (!(pcspec instanceof File)) {
      return NextResponse.json({ error: "PC specs screenshot is required" }, { status: 400 });
    }

    // ---- Supabase (SERVER) client using SERVICE ROLE ----
    const { createClient } = await import("@supabase/supabase-js");

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
    }
    if (!serviceKey) {
      return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    // ---- 1) Create application row ----
    const { data: appRow, error: appErr } = await supabase
      .from("applications")
      .insert({
        full_name: parsed.full_name,
        email: parsed.email,
        phone: parsed.phone,
        home_address: parsed.home_address,
        age: parsed.age,
        education_level: parsed.education_level,
        education_results: parsed.education_results || null,
        has_call_center_experience: parsed.has_call_center_experience,
        comments: parsed.comments || null,
        speed_download_mbps: parsed.speed_download_mbps,
        speed_upload_mbps: parsed.speed_upload_mbps,
        speed_ping_ms: parsed.speed_ping_ms ?? null,
        status: "pending",
      })
      .select("id")
      .single();

    if (appErr) {
      return NextResponse.json({ error: appErr.message }, { status: 400 });
    }

    const appId = appRow?.id as string;
    if (!appId) {
      return NextResponse.json({ error: "Failed to create application id" }, { status: 400 });
    }

    // ---- helper: upload file to storage + record metadata ----
    async function uploadFile(file: File, fileType: string) {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const safeName = `${fileType}.${ext}`;
      const path = `${appId}/${safeName}`;

      const bytes = new Uint8Array(await file.arrayBuffer());

      const { error: upErr } = await supabase.storage
        .from("applications") // must match your lowercase bucket
        .upload(path, bytes, { contentType: file.type, upsert: true });

      if (upErr) throw new Error(`Upload failed (${fileType}): ${upErr.message}`);

      const { error: metaErr } = await supabase.from("application_files").insert({
        application_id: appId,
        file_type: fileType,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      });

      if (metaErr) throw new Error(`File metadata insert failed (${fileType}): ${metaErr.message}`);
    }

    await uploadFile(resume, "resume");
    await uploadFile(speedshot, "speedtest_screenshot");
    await uploadFile(pcspec, "pc_specs_screenshot");

    // ---- 2) Save references ----
    const refRows = parsed.references.map((r) => ({
      application_id: appId,
      ref_name: r.name,
      relationship: r.relationship,
      ref_phone: r.phone,
      ref_email: r.email || null,
    }));

    const { error: refErr } = await supabase.from("application_references").insert(refRows);
    if (refErr) {
      return NextResponse.json({ error: `References insert failed: ${refErr.message}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: appId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 400 });
  }
}


import { NextResponse } from "next/server";
import { PHOTO_PROOF_BUCKET } from "@/lib/photo-proof-storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodyFromCaught } from "@/lib/supabase/errors";

const SIGNED_URL_TTL_SEC = 3600;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ attendanceId: string }> },
) {
  const { attendanceId } = await ctx.params;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("attendance")
      .select("id, photo_proof_used, photo_proof_path")
      .eq("id", attendanceId)
      .maybeSingle();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data?.photo_proof_used || !data.photo_proof_path) {
      return NextResponse.json({ error: "No photo proof for this record." }, { status: 404 });
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from(PHOTO_PROOF_BUCKET)
      .createSignedUrl(data.photo_proof_path, SIGNED_URL_TTL_SEC);

    if (signErr || !signed?.signedUrl) {
      console.error(signErr);
      return NextResponse.json({ error: "Could not load photo." }, { status: 500 });
    }

    return NextResponse.json({
      url: signed.signedUrl,
      path: data.photo_proof_path,
      expires_in: SIGNED_URL_TTL_SEC,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

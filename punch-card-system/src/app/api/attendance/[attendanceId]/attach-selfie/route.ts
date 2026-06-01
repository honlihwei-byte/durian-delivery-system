import { NextResponse } from "next/server";
import {
  loadShopForPunch,
  validatePunchQrToken,
  validateStaffForPunch,
} from "@/lib/attendance-punch";
import { normalizePunchQrToken } from "@/lib/punch-qr-url";
import { uploadSelfieProofFile } from "@/lib/selfie-proof-upload";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodyFromCaught } from "@/lib/supabase/errors";

/** Attach selfie proof to an existing attendance row (background upload after fast punch). */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ attendanceId: string }> },
) {
  const { attendanceId } = await ctx.params;
  try {
    const form = await req.formData();
    const shopId = String(form.get("shop_id") ?? "").trim();
    const staffId = String(form.get("staff_id") ?? "").trim();
    const staffIdentifier = String(form.get("staff_identifier") ?? "").trim();
    const punchQrToken =
      normalizePunchQrToken(form.get("punch_qr_token")) ??
      normalizePunchQrToken(form.get("t"));
    const photoFile = form.get("photo");

    if (!shopId) {
      return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
    }
    if (!(photoFile instanceof File)) {
      return NextResponse.json({ error: "Photo is required." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: attendance, error: loadErr } = await supabase
      .from("attendance")
      .select("id, shop_id, staff_id, action_type")
      .eq("id", attendanceId)
      .maybeSingle();

    if (loadErr) {
      console.error(loadErr);
      return NextResponse.json({ error: loadErr.message }, { status: 500 });
    }
    if (!attendance) {
      return NextResponse.json({ error: "Attendance not found" }, { status: 404 });
    }
    if (String(attendance.shop_id) !== shopId) {
      return NextResponse.json({ error: "Shop mismatch" }, { status: 400 });
    }

    const [shopResult, staffResult] = await Promise.all([
      loadShopForPunch(supabase, shopId),
      validateStaffForPunch(supabase, shopId, {
        staffId: staffId || String(attendance.staff_id),
        staffIdentifier: staffIdentifier || undefined,
      }),
    ]);

    if ("error" in shopResult) {
      return NextResponse.json({ error: shopResult.error }, { status: shopResult.status });
    }
    if ("error" in staffResult) {
      return NextResponse.json({ error: staffResult.error }, { status: staffResult.status });
    }
    if (staffResult.staff.id !== String(attendance.staff_id)) {
      return NextResponse.json({ error: "Staff mismatch" }, { status: 403 });
    }

    const qrCheck = validatePunchQrToken(shopId, shopResult.shop.punchQrToken, punchQrToken);
    if (!qrCheck.ok) {
      return NextResponse.json({ error: qrCheck.error }, { status: 403 });
    }

    const companyId = shopResult.shop.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Shop has no company." }, { status: 400 });
    }

    const uploaded = await uploadSelfieProofFile(supabase, {
      companyId,
      shopId,
      staffId: staffResult.staff.id,
      actionType:
        attendance.action_type === "clock_out" ? "clock_out" : "clock_in",
      file: photoFile,
    });
    if (!uploaded.ok) {
      console.error("[attach-selfie] storage upload failed", {
        attendanceId,
        error: uploaded.error,
        bucket: "attendance-selfies",
      });
      return NextResponse.json({ error: uploaded.error }, { status: uploaded.status });
    }

    console.log("[attach-selfie] storage upload ok", {
      attendanceId,
      bucket: "attendance-selfies",
      path: uploaded.path,
    });

    const capturedAt = uploaded.uploadedAt;
    const { error: updateErr } = await supabase
      .from("attendance")
      .update({
        selfie_proof_used: true,
        selfie_proof_path: uploaded.path,
        selfie_captured_at: capturedAt,
        verification_method: "selfie_proof",
        review_required: true,
        last_updated_at: new Date().toISOString(),
        audit_notes: "Selfie proof attached after punch.",
      })
      .eq("id", attendanceId);

    if (updateErr) {
      console.error(updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      selfie_proof_path: uploaded.path,
      selfie_captured_at: capturedAt,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

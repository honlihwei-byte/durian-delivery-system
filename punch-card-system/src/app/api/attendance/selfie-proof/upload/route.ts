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

/** Upload selfie proof (front camera, attendance-selfies bucket). */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const shopId = String(form.get("shop_id") ?? "").trim();
    const staffId = String(form.get("staff_id") ?? "").trim();
    const staffIdentifier = String(form.get("staff_identifier") ?? "").trim();
    const actionRaw = String(form.get("action_type") ?? "").trim();
    const punchQrToken =
      normalizePunchQrToken(form.get("punch_qr_token")) ??
      normalizePunchQrToken(form.get("t"));
    const photoFile = form.get("photo");

    if (!shopId) {
      return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
    }
    if (actionRaw !== "clock_in" && actionRaw !== "clock_out") {
      return NextResponse.json({ error: "action_type must be clock_in or clock_out" }, { status: 400 });
    }
    if (!(photoFile instanceof File)) {
      return NextResponse.json({ error: "Photo is required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const [shopResult, staffResult] = await Promise.all([
      loadShopForPunch(supabase, shopId),
      validateStaffForPunch(supabase, shopId, {
        staffId: staffId || undefined,
        staffIdentifier: staffIdentifier || undefined,
      }),
    ]);

    if ("error" in shopResult) {
      return NextResponse.json({ error: shopResult.error }, { status: shopResult.status });
    }
    if ("error" in staffResult) {
      return NextResponse.json({ error: staffResult.error }, { status: staffResult.status });
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
      actionType: actionRaw,
      file: photoFile,
    });
    if (!uploaded.ok) {
      return NextResponse.json({ error: uploaded.error }, { status: uploaded.status });
    }

    return NextResponse.json({
      ok: true,
      selfie_proof_path: uploaded.path,
      selfie_captured_at: uploaded.uploadedAt,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

import { NextResponse } from "next/server";
import {
  loadShopForPunch,
  validatePunchQrToken,
  validateStaffForPunch,
} from "@/lib/attendance-punch";
import { normalizePunchQrToken } from "@/lib/punch-qr-url";
import { issueSelfieChallenge } from "@/lib/punch-selfie-challenge";
import { evaluateSelfieProofRequired } from "@/lib/selfie-proof-policy";
import { createAdminClient } from "@/lib/supabase/admin";

/** Pre-punch check: selfie proof requirement (front camera). */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const shopId = url.searchParams.get("shop_id")?.trim();
    const staffId = url.searchParams.get("staff_id")?.trim();
    const staffIdentifier = url.searchParams.get("staff_identifier")?.trim();
    const deviceId = url.searchParams.get("punch_device_id")?.trim() || null;
    const punchQrToken =
      normalizePunchQrToken(url.searchParams.get("punch_qr_token")) ??
      normalizePunchQrToken(url.searchParams.get("t"));

    if (!shopId) {
      return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const shopResult = await loadShopForPunch(supabase, shopId);
    if ("error" in shopResult) {
      return NextResponse.json({ error: shopResult.error }, { status: shopResult.status });
    }

    const { shop } = shopResult;
    const qrCheck = validatePunchQrToken(shopId, shop.punchQrToken, punchQrToken);
    if (!qrCheck.ok) {
      return NextResponse.json({ error: qrCheck.error }, { status: 403 });
    }

    if (!staffId && !staffIdentifier) {
      return NextResponse.json({
        selfie_proof_mode: "off",
        require_selfie_proof: false,
        require_random_selfie: false,
      });
    }

    const staffResult = await validateStaffForPunch(supabase, shopId, {
      staffId: staffId || undefined,
      staffIdentifier: staffIdentifier || undefined,
    });
    if ("error" in staffResult) {
      return NextResponse.json({ error: staffResult.error }, { status: staffResult.status });
    }

    const evaluation = await evaluateSelfieProofRequired(supabase, {
      companyId: shop.companyId,
      staffId: staffResult.staff.id,
      shopId,
      deviceId,
      checkPunchRisk: true,
    });

    const challenge = issueSelfieChallenge({
      staffId: staffResult.staff.id,
      shopId,
      required: evaluation.required,
    });

    return NextResponse.json({
      selfie_proof_mode: evaluation.mode,
      require_selfie_proof: evaluation.required,
      selfie_proof_reason: evaluation.reason,
      require_random_selfie: evaluation.required,
      selfie_challenge_token: challenge.token,
      selfie_challenge_expires_at: challenge.expiresAt,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

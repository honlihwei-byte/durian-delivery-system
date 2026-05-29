import { NextResponse } from "next/server";
import { isNextResponse } from "@/lib/admin-api-auth";
import { assertShopScope, requireCompanyFeatureAccess } from "@/lib/company-scope";
import {
  DEFAULT_SHOP_ANTI_BUDDY,
  fetchShopAntiBuddySettings,
  normalizeAttendanceVerificationMode,
  photoProofFallbackForVerificationMode,
  shopAntiBuddyFromRow,
  SHOP_ANTI_BUDDY_SELECT,
} from "@/lib/shop-anti-buddy";
import { normalizeSelfiePercent, normalizeSelfieProofMode } from "@/lib/selfie-proof-policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodyFromCaught, bodyFromPostgrest } from "@/lib/supabase/errors";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ shopId: string }> },
) {
  const { shopId } = await ctx.params;
  try {
    const supabase = createAdminClient();
    const scope = await requireCompanyFeatureAccess(req, supabase);
    if (isNextResponse(scope)) return scope;
    const deny = await assertShopScope(supabase, shopId, scope.companyId);
    if (deny) return deny;

    const settings = await fetchShopAntiBuddySettings(supabase, shopId);
    if (!settings) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }
    return NextResponse.json({ settings });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ shopId: string }> },
) {
  const { shopId } = await ctx.params;
  try {
    const supabase = createAdminClient();
    const scope = await requireCompanyFeatureAccess(req, supabase);
    if (isNextResponse(scope)) return scope;
    const deny = await assertShopScope(supabase, shopId, scope.companyId);
    if (deny) return deny;

    const body = await req.json();
    const current = (await fetchShopAntiBuddySettings(supabase, shopId)) ?? DEFAULT_SHOP_ANTI_BUDDY;

    const attendance_verification_mode = normalizeAttendanceVerificationMode(
      body.attendance_verification_mode ?? current.attendance_verification_mode,
    );

    const patch: Record<string, unknown> = {
      attendance_verification_mode,
      allow_photo_proof_fallback: photoProofFallbackForVerificationMode(attendance_verification_mode),
      anti_buddy_detect_new_device:
        body.anti_buddy_detect_new_device !== undefined
          ? body.anti_buddy_detect_new_device === true
          : current.anti_buddy_detect_new_device,
      anti_buddy_detect_device_mismatch:
        body.anti_buddy_detect_device_mismatch !== undefined
          ? body.anti_buddy_detect_device_mismatch === true
          : current.anti_buddy_detect_device_mismatch,
      anti_buddy_detect_shared_device:
        body.anti_buddy_detect_shared_device !== undefined
          ? body.anti_buddy_detect_shared_device === true
          : current.anti_buddy_detect_shared_device,
      anti_buddy_flag_rapid_punches:
        body.anti_buddy_flag_rapid_punches !== undefined
          ? body.anti_buddy_flag_rapid_punches === true
          : current.anti_buddy_flag_rapid_punches,
      anti_buddy_require_review_high_risk:
        body.anti_buddy_require_review_high_risk !== undefined
          ? body.anti_buddy_require_review_high_risk === true
          : current.anti_buddy_require_review_high_risk,
      updated_at: new Date().toISOString(),
    };

    if (body.selfie_proof_mode !== undefined) {
      const raw = body.selfie_proof_mode;
      patch.selfie_proof_mode =
        raw === "" || raw === "inherit" || raw == null
          ? null
          : normalizeSelfieProofMode(raw);
    }
    if (body.selfie_proof_random_percent !== undefined) {
      const raw = body.selfie_proof_random_percent;
      patch.selfie_proof_random_percent =
        raw === "" || raw == null ? null : normalizeSelfiePercent(raw);
    }
    if (body.device_enforcement_mode !== undefined) {
      const v = String(body.device_enforcement_mode ?? "");
      patch.device_enforcement_mode =
        v === "" || v === "inherit"
          ? null
          : v === "require_approval" || v === "block_unknown"
            ? v
            : "allow_warn";
    }

    const { data, error } = await supabase
      .from("shops")
      .update(patch)
      .eq("id", shopId)
      .eq("company_id", scope.companyId)
      .select(SHOP_ANTI_BUDDY_SELECT)
      .maybeSingle();

    if (error) {
      console.error(error);
      return NextResponse.json(bodyFromPostgrest(error), { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    return NextResponse.json({ settings: shopAntiBuddyFromRow(data as Record<string, unknown>) });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

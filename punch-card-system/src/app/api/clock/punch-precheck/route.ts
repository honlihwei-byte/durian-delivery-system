import { NextResponse } from "next/server";
import {
  loadShopForPunch,
  validatePunchQrToken,
  validateStaffForPunch,
} from "@/lib/attendance-punch";
import { fetchCompanyAntiBuddySettings } from "@/lib/company-anti-buddy";
import { normalizePunchQrToken } from "@/lib/punch-qr-url";
import { issueSelfieChallenge, rollRandomSelfieRequired } from "@/lib/punch-selfie-challenge";
import { createAdminClient } from "@/lib/supabase/admin";

/** Pre-punch check: random selfie challenge (does not block punch). */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const shopId = url.searchParams.get("shop_id")?.trim();
    const staffId = url.searchParams.get("staff_id")?.trim();
    const staffIdentifier = url.searchParams.get("staff_identifier")?.trim();
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
        random_selfie_enabled: false,
        random_selfie_percent: 0,
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

    const settings = shop.companyId
      ? await fetchCompanyAntiBuddySettings(supabase, shop.companyId)
      : { random_selfie_enabled: false, random_selfie_percent: 0 };

    const requireRandomSelfie =
      settings.random_selfie_enabled &&
      rollRandomSelfieRequired(settings.random_selfie_percent);

    const challenge = issueSelfieChallenge({
      staffId: staffResult.staff.id,
      shopId,
      required: requireRandomSelfie,
    });

    return NextResponse.json({
      random_selfie_enabled: settings.random_selfie_enabled,
      random_selfie_percent: settings.random_selfie_percent,
      require_random_selfie: requireRandomSelfie,
      selfie_challenge_token: challenge.token,
      selfie_challenge_expires_at: challenge.expiresAt,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

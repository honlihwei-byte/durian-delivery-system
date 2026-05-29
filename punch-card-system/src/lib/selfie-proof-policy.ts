import { rollRandomSelfieRequired } from "@/lib/punch-selfie-challenge";
import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

export type SelfieProofMode = "off" | "always" | "risk" | "random";

export type SelfieProofCompanySettings = {
  selfie_proof_mode: SelfieProofMode;
  selfie_proof_random_percent: 0 | 5 | 10 | 20;
  /** @deprecated use selfie_proof_mode=random */
  random_selfie_enabled: boolean;
  random_selfie_percent: 0 | 5 | 10 | 20;
  device_enforcement_mode: "allow_warn" | "require_approval" | "block_unknown";
};

export function normalizeSelfieProofMode(value: unknown): SelfieProofMode {
  const v = String(value ?? "off");
  if (v === "always" || v === "risk" || v === "random") return v;
  return "off";
}

export function normalizeSelfiePercent(value: unknown): 0 | 5 | 10 | 20 {
  const n = typeof value === "number" ? value : Number(value);
  if (n === 5 || n === 10 || n === 20) return n;
  return 0;
}

export function effectiveSelfieProofMode(settings: SelfieProofCompanySettings): SelfieProofMode {
  if (settings.selfie_proof_mode !== "off") return settings.selfie_proof_mode;
  if (settings.random_selfie_enabled) return "random";
  return "off";
}

export async function fetchSelfieProofCompanySettings(
  supabase: Supabase,
  companyId: string,
): Promise<SelfieProofCompanySettings> {
  const { data } = await supabase
    .from("companies")
    .select(
      "selfie_proof_mode, selfie_proof_random_percent, random_selfie_enabled, random_selfie_percent, device_enforcement_mode",
    )
    .eq("id", companyId)
    .maybeSingle();

  if (!data) {
    return {
      selfie_proof_mode: "off",
      selfie_proof_random_percent: 0,
      random_selfie_enabled: false,
      random_selfie_percent: 0,
      device_enforcement_mode: "allow_warn",
    };
  }

  const modeRaw = String((data as Record<string, unknown>).device_enforcement_mode ?? "allow_warn");
  const device_enforcement_mode: SelfieProofCompanySettings["device_enforcement_mode"] =
    modeRaw === "require_approval" || modeRaw === "block_unknown" ? modeRaw : "allow_warn";

  return {
    selfie_proof_mode: normalizeSelfieProofMode(data.selfie_proof_mode),
    selfie_proof_random_percent: normalizeSelfiePercent(data.selfie_proof_random_percent),
    random_selfie_enabled: data.random_selfie_enabled === true,
    random_selfie_percent: normalizeSelfiePercent(data.random_selfie_percent),
    device_enforcement_mode,
  };
}

/** True if device_id is not yet approved for this staff (excluding revoked). */
export async function isNewDeviceForStaff(
  supabase: Supabase,
  staffId: string,
  deviceId: string | null,
): Promise<boolean> {
  if (!deviceId || deviceId === "unknown") return false;

  const { data: existing } = await supabase
    .from("staff_trusted_devices")
    .select("id, approved, revoked_at")
    .eq("staff_id", staffId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (existing && !existing.revoked_at && existing.approved === true) return false;

  const { count } = await supabase
    .from("staff_trusted_devices")
    .select("id", { count: "exact", head: true })
    .eq("staff_id", staffId)
    .is("revoked_at", null);

  return (count ?? 0) > 0 && (!existing || existing.approved !== true);
}

export async function evaluateSelfieProofRequired(
  supabase: Supabase,
  params: {
    companyId: string | null;
    staffId: string;
    shopId?: string;
    deviceId: string | null;
    /** When true, also require selfie for elevated punch risk (risk mode). */
    checkPunchRisk?: boolean;
  },
): Promise<{ required: boolean; reason: string | null; mode: SelfieProofMode }> {
  if (!params.companyId) {
    return { required: false, reason: null, mode: "off" };
  }

  let mode: SelfieProofMode = "off";
  let randomPercent: 0 | 5 | 10 | 20 = 0;
  let resolvedFromShop = false;

  if (params.shopId) {
    const { resolveEffectiveShopAntiBuddy, shopVerificationIncludesSelfie } = await import(
      "@/lib/shop-anti-buddy",
    );
    const effective = await resolveEffectiveShopAntiBuddy(
      supabase,
      params.shopId,
      params.companyId,
    );
    if (effective) {
      if (!shopVerificationIncludesSelfie(effective.attendance_verification_mode)) {
        return { required: false, reason: null, mode: "off" };
      }
      mode = effective.effective_selfie_proof_mode;
      randomPercent = effective.effective_selfie_proof_random_percent;
      resolvedFromShop = true;
    }
  }

  if (!resolvedFromShop) {
    const settings = await fetchSelfieProofCompanySettings(supabase, params.companyId);
    mode = effectiveSelfieProofMode(settings);
    randomPercent = settings.selfie_proof_random_percent || settings.random_selfie_percent;
  }

  if (mode === "off") return { required: false, reason: null, mode };
  if (mode === "always") return { required: true, reason: "always", mode };

  if (mode === "random") {
    if (rollRandomSelfieRequired(randomPercent)) {
      return { required: true, reason: "random", mode };
    }
    return { required: false, reason: null, mode };
  }

  if (mode === "risk") {
    const isNew = await isNewDeviceForStaff(supabase, params.staffId, params.deviceId);
    if (isNew) return { required: true, reason: "new_device", mode };

    if (params.checkPunchRisk && params.shopId) {
      const { assessPunchRisk } = await import("@/lib/punch-risk-assess");
      const { fetchShopAntiBuddySettings, riskControlsFromShop } = await import(
        "@/lib/shop-anti-buddy",
      );
      const shopRow = await fetchShopAntiBuddySettings(supabase, params.shopId);
      const assessment = await assessPunchRisk({
        supabase,
        staffId: params.staffId,
        shopId: params.shopId,
        companyId: params.companyId,
        actionType: "clock_in",
        deviceId: params.deviceId,
        browserInfo: null,
        gpsAccuracyM: null,
        photoProofUsed: false,
        verificationMethod: "gps",
        randomSelfie: false,
        riskControls: shopRow ? riskControlsFromShop(shopRow) : undefined,
      });
      if (assessment.risk_level === "high" || assessment.risk_level === "medium") {
        return { required: true, reason: "high_risk", mode };
      }
    }
    return { required: false, reason: null, mode };
  }

  return { required: false, reason: null, mode };
}

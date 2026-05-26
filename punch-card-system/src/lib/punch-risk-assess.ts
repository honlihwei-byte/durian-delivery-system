import {
  attendanceHasPhotoProofRisk,
  calculateRiskScore,
  isWeakGpsAccuracy,
  riskFlagsFromInput,
  riskLevelFromScore,
  type RiskFlag,
} from "@/lib/punch-risk";
import {
  detectBuddyPunchOnDevice,
  detectDifferentShopShortTime,
  resolveDeviceTrust,
  type DeviceTrustResult,
} from "@/lib/punch-device-trust-db";
import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

export type PunchRiskAssessment = {
  risk_score: number;
  risk_level: "low" | "medium" | "high";
  risk_flags: RiskFlag[];
  device_trust_status: "trusted" | "new_device" | null;
  buddy_punch_flag: boolean;
  review_required: boolean;
  punch_device_id: string | null;
  punch_browser_info: string | null;
};

export type AssessPunchRiskParams = {
  supabase: Supabase;
  staffId: string;
  shopId: string;
  companyId: string | null;
  deviceId: string | null;
  browserInfo: string | null;
  gpsAccuracyM: number | null | undefined;
  photoProofUsed: boolean;
  verificationMethod: string | null;
  randomSelfie: boolean;
  existingReviewRequired?: boolean;
};

export async function assessPunchRisk(
  params: AssessPunchRiskParams,
): Promise<PunchRiskAssessment & { deviceTrust: DeviceTrustResult }> {
  const deviceTrust = await resolveDeviceTrust(params.supabase, {
    staffId: params.staffId,
    companyId: params.companyId,
    deviceId: params.deviceId,
    browserInfo: params.browserInfo,
  });

  let buddyPunch = false;
  if (deviceTrust.deviceId && deviceTrust.deviceId !== "unknown") {
    buddyPunch = await detectBuddyPunchOnDevice(params.supabase, {
      companyId: params.companyId,
      deviceId: deviceTrust.deviceId,
      staffId: params.staffId,
    });
  }

  const differentShop = await detectDifferentShopShortTime(params.supabase, {
    staffId: params.staffId,
    shopId: params.shopId,
  });

  const weakGps = isWeakGpsAccuracy(params.gpsAccuracyM);
  const photoProof =
    params.photoProofUsed ||
    attendanceHasPhotoProofRisk(true, params.verificationMethod);

  const riskInput = {
    newDevice: deviceTrust.isNewDevice,
    buddyPunch,
    weakGps,
    photoProof: photoProof && !params.randomSelfie,
    differentShopShortTime: differentShop,
    randomSelfie: params.randomSelfie,
  };

  const risk_flags = riskFlagsFromInput(riskInput);
  const risk_score = calculateRiskScore(risk_flags);
  const risk_level = riskLevelFromScore(risk_score);

  const review_required =
    params.existingReviewRequired === true ||
    deviceTrust.isNewDevice ||
    buddyPunch ||
    risk_level === "high";

  return {
    risk_score,
    risk_level,
    risk_flags,
    device_trust_status: deviceTrust.deviceTrustStatus,
    buddy_punch_flag: buddyPunch,
    review_required,
    punch_device_id: deviceTrust.deviceId,
    punch_browser_info: deviceTrust.browserInfo,
    deviceTrust,
  };
}

export function mergeRiskIntoInsertRow(
  row: Record<string, unknown>,
  assessment: PunchRiskAssessment,
): Record<string, unknown> {
  return {
    ...row,
    risk_score: assessment.risk_score,
    risk_level: assessment.risk_level,
    risk_flags: assessment.risk_flags,
    device_trust_status: assessment.device_trust_status,
    buddy_punch_flag: assessment.buddy_punch_flag,
    review_required: assessment.review_required,
    punch_device_id: assessment.punch_device_id ?? row.punch_device_id ?? null,
    punch_browser_info: assessment.punch_browser_info,
  };
}

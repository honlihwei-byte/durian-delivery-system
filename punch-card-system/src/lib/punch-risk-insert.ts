import { assessPunchRisk, mergeRiskIntoInsertRow } from "@/lib/punch-risk-assess";
import { verifySelfieChallenge } from "@/lib/punch-selfie-challenge";
import type { createAdminClient } from "@/lib/supabase/admin";
import { fetchCompanyAntiBuddySettings } from "@/lib/company-anti-buddy";

type Supabase = ReturnType<typeof createAdminClient>;

export async function applyAntiBuddyFieldsToInsert(
  supabase: Supabase,
  insertRow: Record<string, unknown>,
  params: {
    staffId: string;
    shopId: string;
    companyId: string | null;
    deviceId: string | null;
    browserInfo: string | null;
    gpsAccuracyM: number | null | undefined;
    photoProofUsed: boolean;
    verificationMethod: string | null;
    randomSelfiePath: string | null;
    selfieChallengeToken: string | null;
    existingReviewRequired?: boolean;
    deviceName?: string | null;
    osName?: string | null;
  },
): Promise<{ row: Record<string, unknown>; error?: string; status?: number }> {
  const challenge = verifySelfieChallenge(
    params.selfieChallengeToken,
    params.staffId,
    params.shopId,
  );
  const randomSelfie = challenge?.required === true;

  if (randomSelfie && !params.randomSelfiePath) {
    return {
      row: insertRow,
      error: "Random selfie verification is required. Please take a selfie and try again.",
      status: 400,
    };
  }

  if (params.randomSelfiePath) {
    const prefix = `${params.shopId}/${params.staffId}/`;
    if (!params.randomSelfiePath.startsWith(prefix)) {
      return { row: insertRow, error: "Invalid random selfie path.", status: 400 };
    }
  }

  const assessment = await assessPunchRisk({
    supabase,
    staffId: params.staffId,
    shopId: params.shopId,
    companyId: params.companyId,
    deviceId: params.deviceId,
    browserInfo: params.browserInfo,
    gpsAccuracyM: params.gpsAccuracyM,
    photoProofUsed: params.photoProofUsed,
    verificationMethod: params.verificationMethod,
    randomSelfie,
    existingReviewRequired: params.existingReviewRequired,
  });

  // Enforce company device policy (do not auto-block by default).
  if (params.companyId && assessment.deviceTrust.deviceTrustStatus === "new_device") {
    const settings = await fetchCompanyAntiBuddySettings(supabase, params.companyId);
    if (settings.device_enforcement_mode === "block_unknown") {
      return {
        row: insertRow,
        error: "New device detected. This company blocks punches from unknown devices.",
        status: 403,
      };
    }
    if (settings.device_enforcement_mode === "require_approval") {
      return {
        row: insertRow,
        error: "New device detected. Manager approval is required before punching from this device.",
        status: 403,
      };
    }
  }

  let row = mergeRiskIntoInsertRow(insertRow, assessment);

  if (randomSelfie && params.randomSelfiePath) {
    row = {
      ...row,
      verification_method: "random_selfie",
      photo_proof_used: true,
      photo_proof_path: params.randomSelfiePath,
      photo_proof_uploaded_at: new Date().toISOString(),
      review_required: true,
      audit_notes: [
        typeof row.audit_notes === "string" ? row.audit_notes : "",
        "Random selfie verification.",
      ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 500),
    };
  }

  return { row };
}

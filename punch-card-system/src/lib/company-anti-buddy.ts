import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

import type { SelfieProofMode } from "@/lib/selfie-proof-policy";
import { normalizeSelfieProofMode } from "@/lib/selfie-proof-policy";

export type AntiBuddyCompanySettings = {
  selfie_proof_mode: SelfieProofMode;
  selfie_proof_random_percent: 0 | 5 | 10 | 20;
  random_selfie_enabled: boolean;
  random_selfie_percent: 0 | 5 | 10 | 20;
  device_enforcement_mode: "allow_warn" | "require_approval" | "block_unknown";
};

const ALLOWED_PERCENTS = new Set([0, 5, 10, 20]);

export function normalizeSelfiePercent(value: unknown): 0 | 5 | 10 | 20 {
  const n = typeof value === "number" ? value : Number(value);
  if (ALLOWED_PERCENTS.has(n as 0 | 5 | 10 | 20)) return n as 0 | 5 | 10 | 20;
  return 0;
}

export async function fetchCompanyAntiBuddySettings(
  supabase: Supabase,
  companyId: string,
): Promise<AntiBuddyCompanySettings> {
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

  const modeRaw = String((data as any).device_enforcement_mode ?? "allow_warn");
  const device_enforcement_mode: AntiBuddyCompanySettings["device_enforcement_mode"] =
    modeRaw === "require_approval" || modeRaw === "block_unknown" ? modeRaw : "allow_warn";

  return {
    selfie_proof_mode: normalizeSelfieProofMode(data.selfie_proof_mode),
    selfie_proof_random_percent: normalizeSelfiePercent(data.selfie_proof_random_percent),
    random_selfie_enabled: data.random_selfie_enabled === true,
    random_selfie_percent: normalizeSelfiePercent(data.random_selfie_percent),
    device_enforcement_mode,
  };
}

import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

export type AntiBuddyCompanySettings = {
  random_selfie_enabled: boolean;
  random_selfie_percent: 0 | 5 | 10 | 20;
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
    .select("random_selfie_enabled, random_selfie_percent")
    .eq("id", companyId)
    .maybeSingle();

  if (!data) {
    return { random_selfie_enabled: false, random_selfie_percent: 0 };
  }

  return {
    random_selfie_enabled: data.random_selfie_enabled === true,
    random_selfie_percent: normalizeSelfiePercent(data.random_selfie_percent),
  };
}

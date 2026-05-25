import type { CompanyRecord } from "@/lib/company";
import { companyRowFromDb } from "@/lib/company";
import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

const COMPANY_SELECT =
  "id, name, code, status, trial_started_at, trial_ends_at, subscription_ends_at, admin_pin, created_at, updated_at";

export async function fetchCompanyById(
  supabase: Supabase,
  companyId: string,
): Promise<CompanyRecord | null> {
  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_SELECT)
    .eq("id", companyId)
    .maybeSingle();
  if (error || !data) return null;
  return companyRowFromDb(data as Record<string, unknown>);
}

export async function fetchCompanyByCode(
  supabase: Supabase,
  code: string,
): Promise<CompanyRecord | null> {
  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_SELECT)
    .ilike("code", code.trim())
    .maybeSingle();
  if (error || !data) return null;
  return companyRowFromDb(data as Record<string, unknown>);
}

export async function fetchCompanyForShop(
  supabase: Supabase,
  shopId: string,
): Promise<CompanyRecord | null> {
  const { data: shop, error } = await supabase
    .from("shops")
    .select("company_id")
    .eq("id", shopId)
    .maybeSingle();
  if (error || !shop?.company_id) return null;
  return fetchCompanyById(supabase, String(shop.company_id));
}

export async function shopIdsForCompany(
  supabase: Supabase,
  companyId: string,
): Promise<string[]> {
  const { data, error } = await supabase.from("shops").select("id").eq("company_id", companyId);
  if (error) return [];
  return (data ?? []).map((r) => String(r.id));
}

export async function assertShopInCompany(
  supabase: Supabase,
  shopId: string,
  companyId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .eq("company_id", companyId)
    .maybeSingle();
  return !error && Boolean(data);
}

export async function listCompaniesSummary(supabase: Supabase) {
  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, code, status, trial_started_at, trial_ends_at, subscription_ends_at, created_at")
    .order("name");
  if (error) throw new Error(error.message);

  const { data: shopCounts } = await supabase.from("shops").select("company_id");
  const counts = new Map<string, number>();
  for (const row of shopCounts ?? []) {
    const cid = String(row.company_id ?? "");
    if (cid) counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }

  return (companies ?? []).map((c) => ({
    ...companyRowFromDb(c as Record<string, unknown>),
    shop_count: counts.get(String(c.id)) ?? 0,
  }));
}

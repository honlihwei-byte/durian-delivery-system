import { NextResponse } from "next/server";
import {
  blockSuperAdminFromOps,
  isNextResponse,
  requireCompanyAdmin,
} from "@/lib/admin-api-auth";
import type { AdminSession } from "@/lib/admin-auth";
import { assertShopInCompany, shopIdsForCompany } from "@/lib/company-db";
import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

export type CompanyAdminScope = {
  session: AdminSession;
  companyId: string;
  companyShopIds: string[];
};

export async function requireCompanyAdminScope(
  req: Request,
  supabase: Supabase,
): Promise<CompanyAdminScope | NextResponse> {
  const session = requireCompanyAdmin(req);
  if (isNextResponse(session)) return session;
  const block = blockSuperAdminFromOps(session);
  if (block) return block;

  const companyId = session.companyId!;
  const companyShopIds = await shopIdsForCompany(supabase, companyId);
  return { session, companyId, companyShopIds };
}

export async function assertShopScope(
  supabase: Supabase,
  shopId: string,
  companyId: string,
): Promise<NextResponse | null> {
  const ok = await assertShopInCompany(supabase, shopId, companyId);
  if (!ok) {
    return NextResponse.json({ error: "Shop not in your company." }, { status: 403 });
  }
  return null;
}

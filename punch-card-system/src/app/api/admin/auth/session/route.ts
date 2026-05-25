import { NextResponse } from "next/server";
import { adminSessionFromRequest } from "@/lib/admin-auth";
import { COMPANY_STATUS_LABELS } from "@/lib/company";
import { fetchCompanyById } from "@/lib/company-db";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const session = adminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  if (session.role === "super_admin") {
    return NextResponse.json({
      authenticated: true,
      role: "super_admin",
      role_label: "Super Admin",
    });
  }

  const supabase = createAdminClient();
  const company = session.companyId
    ? await fetchCompanyById(supabase, session.companyId)
    : null;

  return NextResponse.json({
    authenticated: true,
    role: "company_admin",
    role_label: "Company Admin",
    company: company
      ? {
          id: company.id,
          name: company.name,
          code: company.code,
          status: company.status,
          status_label: COMPANY_STATUS_LABELS[company.status],
        }
      : {
          id: session.companyId,
          name: session.companyName,
          code: session.companyCode,
        },
  });
}

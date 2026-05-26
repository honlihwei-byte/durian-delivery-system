import { NextResponse } from "next/server";
import { sessionCookieHeader, signAdminSession } from "@/lib/admin-auth";
import {
  companyCanLogin,
  companyFeatureAccess,
  getSubscriptionForCompany,
  resolveEffectiveStatus,
} from "@/lib/billing";
import { COMPANY_STATUS_LABELS } from "@/lib/company";
import { fetchCompanyByCompanyIdInput } from "@/lib/company-db";
import { verifyPassword } from "@/lib/password";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodyFromCaught } from "@/lib/supabase/errors";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const companyIdInput = String(body.company_id ?? body.login_id ?? body.company_code ?? "").trim();
    const password = String(body.password ?? "");

    if (!companyIdInput) {
      return NextResponse.json({ error: "Company ID is required." }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const company = await fetchCompanyByCompanyIdInput(supabase, companyIdInput);
    if (!company) {
      return NextResponse.json({ error: "Invalid Company ID or password." }, { status: 401 });
    }

    const sub = await getSubscriptionForCompany(supabase, company);

    if (company.status === "pending_email_verification") {
      return NextResponse.json(
        {
          error: "Please verify your email before signing in.",
          redirect: "/verify-email",
        },
        { status: 403 },
      );
    }

    if (!companyCanLogin(company, sub)) {
      return NextResponse.json(
        { error: "This company account is suspended or inactive." },
        { status: 403 },
      );
    }

    if (!company.password_hash || !verifyPassword(password, company.password_hash)) {
      return NextResponse.json({ error: "Invalid Company ID or password." }, { status: 401 });
    }

    const featureAccess = companyFeatureAccess(company, sub);
    const effectiveStatus = resolveEffectiveStatus(company, sub);
    const displayId = company.login_id?.trim() || company.code;

    const token = signAdminSession({
      role: "company_admin",
      companyId: company.id,
      companyCode: displayId,
      companyName: company.name,
    });

    const redirect =
      featureAccess === "billing_only" ? "/subscription-required" : "/admin";

    return NextResponse.json(
      {
        ok: true,
        role: "company_admin",
        redirect,
        feature_access: featureAccess,
        company: {
          id: company.id,
          name: company.name,
          code: company.code,
          login_id: company.login_id,
          company_id: displayId,
          status: effectiveStatus,
          status_label: COMPANY_STATUS_LABELS[effectiveStatus],
        },
      },
      { headers: { "Set-Cookie": sessionCookieHeader(token) } },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

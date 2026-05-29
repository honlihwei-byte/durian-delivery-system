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
import {
  activateCompanyIfAuthEmailVerified,
  isAuthEmailConfirmed,
} from "@/lib/supabase/auth-company";
import { createAuthClient } from "@/lib/supabase/auth-client";
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
    let company = await fetchCompanyByCompanyIdInput(supabase, companyIdInput);
    if (!company) {
      return NextResponse.json({ error: "Invalid Company ID or password." }, { status: 401 });
    }

    if (company.status === "pending_email_verification") {
      if (company.auth_user_id && company.email) {
        const confirmed = await isAuthEmailConfirmed(supabase, company.auth_user_id);
        if (confirmed) {
          await activateCompanyIfAuthEmailVerified(supabase, company.auth_user_id);
          const refreshed = await fetchCompanyByCompanyIdInput(supabase, companyIdInput);
          if (refreshed) company = refreshed;
        } else {
          return NextResponse.json(
            {
              error: "Please verify your email before using OpsFlow.",
              redirect: `/verify-email?email=${encodeURIComponent(company.email)}`,
            },
            { status: 403 },
          );
        }
      } else {
        return NextResponse.json(
          {
            error: "Please verify your email before using OpsFlow.",
            redirect: company.email
              ? `/verify-email?email=${encodeURIComponent(company.email)}`
              : "/verify-email",
          },
          { status: 403 },
        );
      }
    }

    const sub = await getSubscriptionForCompany(supabase, company);

    if (!companyCanLogin(company, sub)) {
      return NextResponse.json(
        { error: "This company account is suspended or inactive." },
        { status: 403 },
      );
    }

    let passwordOk = false;

    if (company.auth_user_id && company.email) {
      const auth = createAuthClient();
      const { data, error } = await auth.auth.signInWithPassword({
        email: company.email,
        password,
      });
      if (!error && data.user) {
        passwordOk = true;
        if (!data.user.email_confirmed_at) {
          return NextResponse.json(
            {
              error: "Please verify your email before using OpsFlow.",
              redirect: `/verify-email?email=${encodeURIComponent(company.email)}`,
            },
            { status: 403 },
          );
        }
      }
    }

    if (!passwordOk) {
      if (!company.password_hash || !verifyPassword(password, company.password_hash)) {
        return NextResponse.json({ error: "Invalid Company ID or password." }, { status: 401 });
      }
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

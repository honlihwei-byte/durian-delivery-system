import { NextResponse } from "next/server";
import { sessionCookieHeader, signAdminSession } from "@/lib/admin-auth";
import { companySubscriptionAccess, subscriptionBlockMessage } from "@/lib/company";
import { isValidCompanyLoginId, normalizeCompanyLoginId } from "@/lib/company-auth";
import { fetchCompanyByLoginId } from "@/lib/company-db";
import { verifyPassword } from "@/lib/password";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodyFromCaught } from "@/lib/supabase/errors";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const loginId = normalizeCompanyLoginId(String(body.company_id ?? body.login_id ?? ""));
    const password = String(body.password ?? "");

    if (!isValidCompanyLoginId(loginId)) {
      return NextResponse.json(
        { error: "Company ID must look like CMP-XXXXXX." },
        { status: 400 },
      );
    }
    if (!password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const company = await fetchCompanyByLoginId(supabase, loginId);
    if (!company) {
      return NextResponse.json({ error: "Invalid Company ID or password." }, { status: 401 });
    }

    if (company.active === false) {
      return NextResponse.json({ error: "This company account is inactive." }, { status: 403 });
    }

    if (!verifyPassword(password, company.password_hash)) {
      return NextResponse.json({ error: "Invalid Company ID or password." }, { status: 401 });
    }

    const access = companySubscriptionAccess(company);
    if (access !== "allowed") {
      return NextResponse.json(
        { error: subscriptionBlockMessage(access) },
        { status: 403 },
      );
    }

    const token = signAdminSession({
      role: "company_admin",
      companyId: company.id,
      companyCode: company.code,
      companyName: company.name,
    });

    return NextResponse.json(
      {
        ok: true,
        role: "company_admin",
        company: {
          id: company.id,
          name: company.name,
          code: company.code,
          login_id: company.login_id,
          status: company.status,
        },
      },
      { headers: { "Set-Cookie": sessionCookieHeader(token) } },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

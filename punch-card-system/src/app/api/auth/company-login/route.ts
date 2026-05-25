import { NextResponse } from "next/server";
import { sessionCookieHeader, signAdminSession } from "@/lib/admin-auth";
import { companySubscriptionAccess, subscriptionBlockMessage } from "@/lib/company";
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

    if (company.active === false) {
      return NextResponse.json({ error: "This company account is inactive." }, { status: 403 });
    }

    if (!company.password_hash || !verifyPassword(password, company.password_hash)) {
      return NextResponse.json({ error: "Invalid Company ID or password." }, { status: 401 });
    }

    const access = companySubscriptionAccess(company);
    if (access !== "allowed") {
      return NextResponse.json(
        { error: subscriptionBlockMessage(access) },
        { status: 403 },
      );
    }

    const displayId = company.login_id?.trim() || company.code;
    const token = signAdminSession({
      role: "company_admin",
      companyId: company.id,
      companyCode: displayId,
      companyName: company.name,
    });

    return NextResponse.json(
      {
        ok: true,
        role: "company_admin",
        redirect: "/admin",
        company: {
          id: company.id,
          name: company.name,
          code: company.code,
          login_id: company.login_id,
          company_id: displayId,
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

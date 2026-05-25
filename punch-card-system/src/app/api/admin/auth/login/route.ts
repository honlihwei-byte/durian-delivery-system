import { NextResponse } from "next/server";
import { normalizeCompanyCode } from "@/lib/company";
import {
  sessionCookieHeader,
  signAdminSession,
  verifyCompanyAdminPin,
  verifySuperAdminPin,
} from "@/lib/admin-auth";
import { fetchCompanyByCode } from "@/lib/company-db";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodyFromCaught } from "@/lib/supabase/errors";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pin = String(body.pin ?? "").trim();
    const role = body.role === "super_admin" ? "super_admin" : "company_admin";

    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be 6 digits." }, { status: 400 });
    }

    if (role === "super_admin") {
      if (!verifySuperAdminPin(pin)) {
        return NextResponse.json({ error: "Invalid Super Admin PIN." }, { status: 401 });
      }
      const token = signAdminSession({ role: "super_admin" });
      return NextResponse.json(
        { ok: true, role: "super_admin" },
        { headers: { "Set-Cookie": sessionCookieHeader(token) } },
      );
    }

    const companyCode = normalizeCompanyCode(String(body.company_code ?? body.companyCode ?? ""));
    if (!companyCode) {
      return NextResponse.json({ error: "Company code is required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const company = await fetchCompanyByCode(supabase, companyCode);
    if (!company) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }
    if (!verifyCompanyAdminPin(company, pin)) {
      return NextResponse.json({ error: "Invalid Company Admin PIN." }, { status: 401 });
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
        company: { id: company.id, name: company.name, code: company.code, status: company.status },
      },
      { headers: { "Set-Cookie": sessionCookieHeader(token) } },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { fetchCompanyByCompanyIdInput } from "@/lib/company-db";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodyFromCaught } from "@/lib/supabase/errors";

/** Always returns success to avoid account enumeration. Email delivery can be wired later. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const companyIdInput = String(body.company_id ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!companyIdInput) {
      return NextResponse.json({ error: "Company ID is required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const company = await fetchCompanyByCompanyIdInput(supabase, companyIdInput);
    if (company?.email && company.email.toLowerCase() === email) {
      console.info("[forgot-password] reset requested for company", company.login_id ?? company.code);
    }

    return NextResponse.json({
      ok: true,
      message:
        "If an account matches that Company ID and email, password reset instructions will be sent.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

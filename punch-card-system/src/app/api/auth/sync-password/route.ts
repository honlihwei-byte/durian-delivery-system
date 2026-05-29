import { NextResponse } from "next/server";
import { fetchCompanyByEmail } from "@/lib/company-db";
import { hashPassword } from "@/lib/password";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodyFromCaught } from "@/lib/supabase/errors";

/** Sync companies.password_hash after Supabase Auth password reset on client. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const company = await fetchCompanyByEmail(supabase, email);
    if (!company) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }

    await supabase
      .from("companies")
      .update({
        password_hash: hashPassword(password),
        updated_at: new Date().toISOString(),
      })
      .eq("id", company.id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

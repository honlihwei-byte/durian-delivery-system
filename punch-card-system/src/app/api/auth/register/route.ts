import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { generateCompanyCode, generateCompanyLoginId, trialWindowFromNow } from "@/lib/company-auth";
import { fetchCompanyByEmail, fetchCompanyByLoginId } from "@/lib/company-db";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodyFromCaught, bodyFromPostgrest } from "@/lib/supabase/errors";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const companyName = String(body.company_name ?? "").trim();
    const ownerName = String(body.owner_name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const confirm = String(body.confirm_password ?? body.confirmPassword ?? "");

    if (!companyName || !ownerName || !phone || !email) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (password !== confirm) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }
    const pwErr = validatePasswordStrength(password);
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

    const supabase = createAdminClient();

    const existingEmail = await fetchCompanyByEmail(supabase, email);
    if (existingEmail) {
      return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
    }

    const trial = trialWindowFromNow();
    let loginId = "";
    let companyCode = "";
    let inserted: Record<string, unknown> | null = null;

    for (let attempt = 0; attempt < 8; attempt++) {
      loginId = generateCompanyLoginId();
      companyCode = generateCompanyCode(companyName);

      const clashLogin = await fetchCompanyByLoginId(supabase, loginId);
      if (clashLogin) continue;

      const { data: clashCode } = await supabase
        .from("companies")
        .select("id")
        .ilike("code", companyCode)
        .maybeSingle();
      if (clashCode) continue;

      const { data, error } = await supabase
        .from("companies")
        .insert({
          name: companyName,
          code: companyCode,
          login_id: loginId,
          password_hash: hashPassword(password),
          owner_name: ownerName,
          phone,
          email,
          status: "trial",
          active: true,
          trial_started_at: trial.trial_started_at,
          trial_ends_at: trial.trial_ends_at,
          admin_pin: "000000",
        })
        .select("id, name, code, login_id, status, trial_ends_at")
        .single();

      if (!error && data) {
        inserted = data as Record<string, unknown>;
        break;
      }
      if (error?.code !== "23505") {
        return NextResponse.json(bodyFromPostgrest(error), { status: 500 });
      }
    }

    if (!inserted) {
      return NextResponse.json({ error: "Could not create company. Try again." }, { status: 500 });
    }

    const companyId = String(inserted.id);
    await supabase.from("subscriptions").upsert(
      {
        company_id: companyId,
        status: "trial",
        trial_started_at: trial.trial_started_at,
        trial_ends_at: trial.trial_ends_at,
      },
      { onConflict: "company_id" },
    );

    await supabase.from("company_users").insert({
      company_id: companyId,
      user_id: randomUUID(),
      role: "company_admin",
      email,
      display_name: ownerName,
    });

    return NextResponse.json({
      ok: true,
      company: {
        id: companyId,
        name: String(inserted.name),
        code: String(inserted.code),
        login_id: loginId,
        status: "trial",
        trial_ends_at: trial.trial_ends_at,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

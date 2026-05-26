import { NextResponse } from "next/server";
import { sessionCookieHeader, signAdminSession } from "@/lib/admin-auth";
import { activateCompanyAfterEmailVerification } from "@/lib/company-activation";
import { fetchCompanyById } from "@/lib/company-db";
import { verifyEmailOtp, verifyEmailToken } from "@/lib/email-verification";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodyFromCaught } from "@/lib/supabase/errors";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const verified = await verifyEmailToken(supabase, token);
    if (!verified) {
      return NextResponse.json({ error: "Invalid or expired verification link." }, { status: 400 });
    }

    const { login_id, trial_ends_at } = await activateCompanyAfterEmailVerification(
      supabase,
      verified.companyId,
    );
    const company = await fetchCompanyById(supabase, verified.companyId);

    const sessionToken = signAdminSession({
      role: "company_admin",
      companyId: verified.companyId,
      companyCode: login_id,
      companyName: company?.name ?? "",
    });

    return NextResponse.json(
      {
        ok: true,
        login_id,
        trial_ends_at,
        redirect: "/admin",
      },
      { headers: { "Set-Cookie": sessionCookieHeader(sessionToken) } },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const otp = String(body.otp ?? body.code ?? "").trim();
    const token = String(body.token ?? "").trim();

    const supabase = createAdminClient();
    let companyId: string | null = null;

    if (token) {
      const v = await verifyEmailToken(supabase, token);
      companyId = v?.companyId ?? null;
    } else if (email && otp) {
      const v = await verifyEmailOtp(supabase, email, otp);
      companyId = v?.companyId ?? null;
    } else {
      return NextResponse.json({ error: "Provide token or email + OTP." }, { status: 400 });
    }

    if (!companyId) {
      return NextResponse.json({ error: "Invalid or expired verification." }, { status: 400 });
    }

    const { login_id, trial_ends_at } = await activateCompanyAfterEmailVerification(
      supabase,
      companyId,
    );
    const company = await fetchCompanyById(supabase, companyId);

    const sessionToken = signAdminSession({
      role: "company_admin",
      companyId,
      companyCode: login_id,
      companyName: company?.name ?? "",
    });

    return NextResponse.json(
      {
        ok: true,
        login_id,
        trial_ends_at,
        redirect: "/admin",
      },
      { headers: { "Set-Cookie": sessionCookieHeader(sessionToken) } },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

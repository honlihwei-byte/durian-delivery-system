import { NextResponse } from "next/server";
import { syncCompanyEmailVerificationFromAuth } from "@/lib/email-verification-sync";
import { fetchCompanyByAuthUserId, fetchCompanyByEmail } from "@/lib/company-db";
import { createAuthClient } from "@/lib/supabase/auth-client";
import { getAppBaseUrl } from "@/lib/supabase/auth-url";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Supabase email confirmation / magic-link callback.
 * Redirects to /login?verified=1 after activating pending company trial.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const loginUrl = `${getAppBaseUrl()}/login`;

  try {
    const auth = createAuthClient();
    let userId: string | null = null;
    let userEmail: string | null = null;

    if (code) {
      const { data, error } = await auth.auth.exchangeCodeForSession(code);
      if (error || !data.user) {
        return NextResponse.redirect(`${loginUrl}?error=verification_failed`);
      }
      userId = data.user.id;
      userEmail = data.user.email ?? null;
    } else if (tokenHash && type) {
      const otpType = type === "signup" ? "signup" : type === "email" ? "email" : type;
      const { data, error } = await auth.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType as "signup" | "email",
      });
      if (error || !data.user) {
        return NextResponse.redirect(`${loginUrl}?error=verification_failed`);
      }
      userId = data.user.id;
      userEmail = data.user.email ?? null;
    } else {
      return NextResponse.redirect(`${loginUrl}?error=missing_token`);
    }

    const admin = createAdminClient();
    const company =
      (userId ? await fetchCompanyByAuthUserId(admin, userId) : null) ??
      (userEmail ? await fetchCompanyByEmail(admin, userEmail) : null);
    if (company) {
      await syncCompanyEmailVerificationFromAuth(admin, company);
    }

    return NextResponse.redirect(`${loginUrl}?verified=1`);
  } catch (e) {
    console.error("[auth/callback]", e);
    return NextResponse.redirect(`${loginUrl}?error=verification_failed`);
  }
}

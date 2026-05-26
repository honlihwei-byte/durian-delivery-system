import { NextResponse } from "next/server";
import {
  fetchCompanyAntiBuddySettings,
  normalizeSelfiePercent,
} from "@/lib/company-anti-buddy";
import { isNextResponse } from "@/lib/admin-api-auth";
import { requireCompanyFeatureAccess } from "@/lib/company-scope";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const supabase = createAdminClient();
    const scope = await requireCompanyFeatureAccess(req, supabase);
    if (isNextResponse(scope)) return scope;

    const settings = await fetchCompanyAntiBuddySettings(supabase, scope.companyId);
    return NextResponse.json({ settings });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = createAdminClient();
    const scope = await requireCompanyFeatureAccess(req, supabase);
    if (isNextResponse(scope)) return scope;

    const body = await req.json();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.random_selfie_enabled !== undefined) {
      patch.random_selfie_enabled = body.random_selfie_enabled === true;
    }
    if (body.random_selfie_percent !== undefined) {
      patch.random_selfie_percent = normalizeSelfiePercent(body.random_selfie_percent);
    }

    const { error } = await supabase.from("companies").update(patch).eq("id", scope.companyId);
    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }

    const settings = await fetchCompanyAntiBuddySettings(supabase, scope.companyId);
    return NextResponse.json({ settings });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

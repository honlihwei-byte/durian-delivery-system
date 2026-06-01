import { NextResponse } from "next/server";
import {
  fetchCompanyAntiBuddySettings,
  normalizeSelfiePercent,
} from "@/lib/company-anti-buddy";
import { normalizeSelfieProofMode } from "@/lib/selfie-proof-policy";
import { isNextResponse } from "@/lib/admin-api-auth";
import { requireCompanyFeatureAccess } from "@/lib/company-scope";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodyFromCaught, bodyFromPostgrest } from "@/lib/supabase/errors";

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
    const patch: Record<string, unknown> = {};

    if (body.selfie_proof_mode !== undefined) {
      patch.selfie_proof_mode = normalizeSelfieProofMode(body.selfie_proof_mode);
      const mode = patch.selfie_proof_mode as string;
      patch.random_selfie_enabled = mode === "random";
    }
    if (body.selfie_proof_random_percent !== undefined) {
      const pct = normalizeSelfiePercent(body.selfie_proof_random_percent);
      patch.selfie_proof_random_percent = pct;
      patch.random_selfie_percent = pct;
    }
    if (body.random_selfie_enabled !== undefined) {
      patch.random_selfie_enabled = body.random_selfie_enabled === true;
      if (body.random_selfie_enabled === true && body.selfie_proof_mode === undefined) {
        patch.selfie_proof_mode = "random";
      }
      if (body.random_selfie_enabled === false && body.selfie_proof_mode === undefined) {
        patch.selfie_proof_mode = "off";
      }
    }
    if (body.random_selfie_percent !== undefined) {
      const pct = normalizeSelfiePercent(body.random_selfie_percent);
      patch.random_selfie_percent = pct;
      patch.selfie_proof_random_percent = pct;
    }
    if (body.device_enforcement_mode !== undefined) {
      const v = String(body.device_enforcement_mode ?? "");
      patch.device_enforcement_mode =
        v === "require_approval" || v === "block_unknown" ? v : "allow_warn";
    }

    if (Object.keys(patch).length === 0) {
      const settings = await fetchCompanyAntiBuddySettings(supabase, scope.companyId);
      return NextResponse.json({ settings, message: "No changes to save." });
    }

    patch.updated_at = new Date().toISOString();

    const { error } = await supabase.from("companies").update(patch).eq("id", scope.companyId);
    if (error) {
      console.error(error);
      return NextResponse.json(bodyFromPostgrest(error), { status: 500 });
    }

    const settings = await fetchCompanyAntiBuddySettings(supabase, scope.companyId);
    return NextResponse.json({ settings, message: "Settings saved successfully." });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

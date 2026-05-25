import { NextResponse } from "next/server";
import { trialEndsAtFromStart, COMPANY_STATUS_LABELS, type CompanyStatus } from "@/lib/company";
import {
  forbiddenAdmin,
  isNextResponse,
  requireSuperAdmin,
} from "@/lib/admin-api-auth";
import { listCompaniesSummary } from "@/lib/company-db";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodyFromCaught, bodyFromPostgrest } from "@/lib/supabase/errors";

export async function GET(req: Request) {
  const session = requireSuperAdmin(req);
  if (isNextResponse(session)) return session;

  try {
    const supabase = createAdminClient();
    const rows = await listCompaniesSummary(supabase);
    return NextResponse.json({
      companies: rows.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        status: c.status,
        status_label: COMPANY_STATUS_LABELS[c.status],
        trial_ends_at: c.trial_ends_at,
        subscription_ends_at: c.subscription_ends_at,
        shop_count: c.shop_count,
        created_at: c.created_at,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = requireSuperAdmin(req);
  if (isNextResponse(session)) return session;

  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const code = String(body.code ?? "").trim().toUpperCase();
    const status = (body.status ?? "trial") as CompanyStatus;
    const adminPin = String(body.admin_pin ?? "520123").trim();

    if (!name || !code) {
      return NextResponse.json({ error: "name and code are required" }, { status: 400 });
    }

    const trialStart = new Date();
    const trialEnd = trialEndsAtFromStart(trialStart);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("companies")
      .insert({
        name,
        code,
        status,
        trial_started_at: trialStart.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
        admin_pin: adminPin,
      })
      .select("id, name, code, status, trial_ends_at")
      .single();

    if (error) {
      return NextResponse.json(bodyFromPostgrest(error), { status: 500 });
    }

    return NextResponse.json({ company: data });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = requireSuperAdmin(req);
  if (isNextResponse(session)) return session;

  try {
    const body = await req.json();
    const id = String(body.id ?? "").trim();
    const status = body.status as CompanyStatus | undefined;
    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }
    const allowed: CompanyStatus[] = ["trial", "active", "suspended", "expired"];
    if (!allowed.includes(status)) {
      return forbiddenAdmin("Invalid status");
    }

    const supabase = createAdminClient();
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === "active" && body.extend_subscription) {
      const end = new Date();
      end.setFullYear(end.getFullYear() + 1);
      patch.subscription_ends_at = end.toISOString();
    }

    const { data, error } = await supabase
      .from("companies")
      .update(patch)
      .eq("id", id)
      .select("id, name, code, status, trial_ends_at, subscription_ends_at")
      .single();

    if (error) {
      return NextResponse.json(bodyFromPostgrest(error), { status: 500 });
    }

    return NextResponse.json({ company: data });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

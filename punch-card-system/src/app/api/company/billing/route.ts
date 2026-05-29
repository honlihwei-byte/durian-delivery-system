import { NextResponse } from "next/server";
import {
  attendanceCountForCompany,
  getPlanLimitsForCompany,
  getSubscriptionForCompany,
} from "@/lib/billing";
import { isNextResponse, requireCompanyAdmin } from "@/lib/admin-api-auth";
import { fetchCompanyById } from "@/lib/company-db";
import { ALL_PLAN_FEATURES, planDisplayName, SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodyFromCaught } from "@/lib/supabase/errors";

export async function GET(req: Request) {
  const session = requireCompanyAdmin(req);
  if (isNextResponse(session)) return session;

  try {
    const supabase = createAdminClient();
    const companyId = session.companyId!;
    const company = await fetchCompanyById(supabase, companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const sub = await getSubscriptionForCompany(supabase, company);
    const [limits, attendanceCount] = await Promise.all([
      getPlanLimitsForCompany(supabase, companyId, sub),
      attendanceCountForCompany(supabase, companyId),
    ]);

    const { data: payments } = await supabase
      .from("payments")
      .select(
        "id, plan_slug, amount_cents, currency, status, reference_code, due_at, paid_at, created_at",
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: invoices } = await supabase
      .from("invoices")
      .select(
        "id, invoice_number, plan_slug, amount_cents, currency, status, issued_at, paid_at, period_start, period_end",
      )
      .eq("company_id", companyId)
      .order("issued_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      company: {
        name: company.name,
        company_id: company.login_id?.trim() || company.code,
      },
      subscription: {
        plan_slug: sub.plan_slug,
        plan_name: planDisplayName(sub.plan_slug),
        status: sub.status,
        payment_status: sub.payment_status,
        trial_started_at: sub.trial_started_at,
        trial_ends_at: sub.trial_ends_at,
        subscription_ends_at: sub.subscription_ends_at,
        next_billing_at: sub.next_billing_at,
        renewal_date: sub.subscription_ends_at,
        staff_count: limits.staff_used,
        shop_count: limits.shop_used,
        staff_limit: limits.max_staff,
        shop_limit: limits.max_shops,
        extra_shops: sub.extra_shops,
        extra_staff_packs: sub.extra_staff_packs,
      },
      summary: {
        attendance_records: attendanceCount,
      },
      plans: SUBSCRIPTION_PLANS,
      all_features: ALL_PLAN_FEATURES,
      payments: payments ?? [],
      invoices: invoices ?? [],
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

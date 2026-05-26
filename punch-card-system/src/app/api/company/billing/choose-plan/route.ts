import { NextResponse } from "next/server";
import { createPendingPlanPayment } from "@/lib/billing";
import { isNextResponse, requireCompanyAdmin } from "@/lib/admin-api-auth";
import { fetchCompanyById } from "@/lib/company-db";
import { planBySlug, whatsAppPaymentUrl, type PlanSlug } from "@/lib/subscription-plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodyFromCaught } from "@/lib/supabase/errors";

export async function POST(req: Request) {
  const session = requireCompanyAdmin(req);
  if (isNextResponse(session)) return session;

  try {
    const body = await req.json();
    const planSlug = String(body.plan_slug ?? "") as PlanSlug;

    if (planSlug === "enterprise") {
      return NextResponse.json({
        ok: true,
        enterprise: true,
        whatsapp_url: whatsAppPaymentUrl(session.companyName ?? "Company", "Enterprise", "ENT"),
      });
    }

    const plan = planBySlug(planSlug);
    if (!plan?.amountCents) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const company = await fetchCompanyById(supabase, session.companyId!);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const { paymentId, reference } = await createPendingPlanPayment(supabase, company, planSlug);

    return NextResponse.json({
      ok: true,
      payment_id: paymentId,
      reference,
      plan_slug: planSlug,
      plan_name: plan.name,
      amount_label: plan.priceLabel,
      whatsapp_url: whatsAppPaymentUrl(company.name, plan.name, reference),
      instructions:
        "Pay via bank transfer or WhatsApp, then our team will activate your subscription within 1 business day.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

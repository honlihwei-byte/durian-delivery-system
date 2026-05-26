import type { CompanyRecord, CompanyStatus } from "@/lib/company";
import { trialEndsAtFromStart } from "@/lib/company";
import { planBySlug, type PaymentStatus, type PlanSlug } from "@/lib/subscription-plans";
import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

export type SubscriptionRow = {
  company_id: string;
  status: CompanyStatus;
  plan_slug: string;
  payment_status: PaymentStatus;
  trial_started_at: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  max_staff: number | null;
};

export type CompanyFeatureAccess = "full" | "billing_only" | "blocked";

export function subscriptionRowFromDb(row: Record<string, unknown>): SubscriptionRow {
  return {
    company_id: String(row.company_id),
    status: row.status as CompanyStatus,
    plan_slug: String(row.plan_slug ?? "trial"),
    payment_status: (row.payment_status as PaymentStatus) ?? "pending",
    trial_started_at: String(row.trial_started_at ?? new Date().toISOString()),
    trial_ends_at: row.trial_ends_at != null ? String(row.trial_ends_at) : null,
    subscription_ends_at:
      row.subscription_ends_at != null ? String(row.subscription_ends_at) : null,
    max_staff: row.max_staff != null ? Number(row.max_staff) : null,
  };
}

export async function fetchSubscription(
  supabase: Supabase,
  companyId: string,
): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "company_id, status, plan_slug, payment_status, trial_started_at, trial_ends_at, subscription_ends_at, max_staff",
    )
    .eq("company_id", companyId)
    .maybeSingle();
  if (error || !data) return null;
  return subscriptionRowFromDb(data as Record<string, unknown>);
}

/** Derive subscription from company when subscriptions row missing. */
export function subscriptionFromCompany(company: CompanyRecord): SubscriptionRow {
  return {
    company_id: company.id,
    status: company.status,
    plan_slug: company.status === "trial" ? "trial" : "starter",
    payment_status: company.status === "active" ? "paid" : "pending",
    trial_started_at: company.trial_started_at,
    trial_ends_at: company.trial_ends_at,
    subscription_ends_at: company.subscription_ends_at,
    max_staff: null,
  };
}

export async function getSubscriptionForCompany(
  supabase: Supabase,
  company: CompanyRecord,
): Promise<SubscriptionRow> {
  const sub = await fetchSubscription(supabase, company.id);
  return sub ?? subscriptionFromCompany(company);
}

export function resolveEffectiveStatus(
  company: CompanyRecord,
  sub: SubscriptionRow,
): CompanyStatus {
  if (company.active === false || sub.status === "suspended" || company.status === "suspended") {
    return "suspended";
  }
  const now = Date.now();
  if (sub.status === "active" || company.status === "active") {
    const end = sub.subscription_ends_at ?? company.subscription_ends_at;
    if (end && new Date(end).getTime() < now) return "expired";
    return "active";
  }
  if (sub.status === "trial" || company.status === "trial") {
    const end = sub.trial_ends_at ?? company.trial_ends_at;
    if (end && new Date(end).getTime() < now) return "expired";
    return "trial";
  }
  if (sub.status === "expired" || company.status === "expired") return "expired";
  return sub.status ?? company.status;
}

/** Login: blocked only when suspended or inactive. */
export function companyCanLogin(company: CompanyRecord, sub: SubscriptionRow): boolean {
  if (company.active === false) return false;
  const effective = resolveEffectiveStatus(company, sub);
  return effective !== "suspended";
}

/** Admin features vs billing-only pages. */
export function companyFeatureAccess(
  company: CompanyRecord,
  sub: SubscriptionRow,
): CompanyFeatureAccess {
  if (!companyCanLogin(company, sub)) return "blocked";
  const effective = resolveEffectiveStatus(company, sub);
  if (effective === "active") return "full";
  if (effective === "trial") return "full";
  return "billing_only";
}

export function clockSubscriptionMessage(): string {
  return "Subscription expired. Please contact your employer.";
}

export async function syncCompanyFromSubscription(
  supabase: Supabase,
  companyId: string,
  sub: Partial<SubscriptionRow> & { status: CompanyStatus },
): Promise<void> {
  const patch: Record<string, unknown> = {
    status: sub.status,
    updated_at: new Date().toISOString(),
  };
  if (sub.trial_started_at) patch.trial_started_at = sub.trial_started_at;
  if (sub.trial_ends_at !== undefined) patch.trial_ends_at = sub.trial_ends_at;
  if (sub.subscription_ends_at !== undefined) patch.subscription_ends_at = sub.subscription_ends_at;

  await supabase.from("companies").update(patch).eq("id", companyId);

  await supabase.from("subscriptions").upsert(
    {
      company_id: companyId,
      status: sub.status,
      plan_slug: sub.plan_slug ?? "starter",
      payment_status: sub.payment_status ?? "pending",
      trial_started_at: sub.trial_started_at,
      trial_ends_at: sub.trial_ends_at,
      subscription_ends_at: sub.subscription_ends_at,
      max_staff: sub.max_staff,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" },
  );
}

export function addDays(iso: string | null, days: number): string {
  const d = iso ? new Date(iso) : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function staffCountForCompany(supabase: Supabase, companyId: string): Promise<number> {
  const { count } = await supabase
    .from("staff")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);
  return count ?? 0;
}

export async function shopCountForCompany(supabase: Supabase, companyId: string): Promise<number> {
  const { count } = await supabase
    .from("shops")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);
  return count ?? 0;
}

export function nextInvoiceNumber(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const r = Math.floor(Math.random() * 9000 + 1000);
  return `INV-${y}${m}-${r}`;
}

export function nextPaymentReference(): string {
  return `PAY-${Date.now().toString(36).toUpperCase()}`;
}

export async function createPendingPlanPayment(
  supabase: Supabase,
  company: CompanyRecord,
  planSlug: PlanSlug,
): Promise<{ paymentId: string; invoiceId: string; reference: string }> {
  const plan = planBySlug(planSlug);
  if (!plan || plan.amountCents == null) {
    throw new Error("Invalid plan for self-service checkout.");
  }

  const reference = nextPaymentReference();
  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + 7);

  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      company_id: company.id,
      plan_slug: planSlug,
      amount_cents: plan.amountCents,
      currency: "MYR",
      status: "pending",
      reference_code: reference,
      due_at: dueAt.toISOString(),
      notes: `${plan.name} monthly subscription`,
    })
    .select("id")
    .single();

  if (payErr || !payment) throw new Error(payErr?.message ?? "Payment create failed");

  const invNum = nextInvoiceNumber();
  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      company_id: company.id,
      payment_id: payment.id,
      invoice_number: invNum,
      plan_slug: planSlug,
      amount_cents: plan.amountCents,
      status: "issued",
      period_start: new Date().toISOString(),
      period_end: addDays(new Date().toISOString(), 30),
    })
    .select("id")
    .single();

  if (invErr || !invoice) throw new Error(invErr?.message ?? "Invoice create failed");

  await supabase
    .from("subscriptions")
    .upsert(
      {
        company_id: company.id,
        plan_slug: planSlug,
        payment_status: "pending",
        max_staff: plan.maxStaff,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" },
    );

  return {
    paymentId: String(payment.id),
    invoiceId: String(invoice.id),
    reference,
  };
}

export async function markPaymentPaidAndActivate(
  supabase: Supabase,
  companyId: string,
  paymentId?: string,
): Promise<void> {
  const now = new Date();
  const subEnd = new Date(now);
  subEnd.setDate(subEnd.getDate() + 30);

  if (paymentId) {
    await supabase
      .from("payments")
      .update({ status: "paid", paid_at: now.toISOString(), updated_at: now.toISOString() })
      .eq("id", paymentId)
      .eq("company_id", companyId);

    const { data: pay } = await supabase
      .from("payments")
      .select("id, plan_slug")
      .eq("id", paymentId)
      .maybeSingle();

    if (pay) {
      await supabase
        .from("invoices")
        .update({ status: "paid", paid_at: now.toISOString() })
        .eq("payment_id", paymentId);

      const plan = planBySlug(String(pay.plan_slug));
      await syncCompanyFromSubscription(supabase, companyId, {
        status: "active",
        plan_slug: String(pay.plan_slug),
        payment_status: "paid",
        subscription_ends_at: subEnd.toISOString(),
        max_staff: plan?.maxStaff ?? null,
      });
      return;
    }
  }

  const sub = await fetchSubscription(supabase, companyId);
  await syncCompanyFromSubscription(supabase, companyId, {
    status: "active",
    plan_slug: sub?.plan_slug ?? "starter",
    payment_status: "paid",
    subscription_ends_at: subEnd.toISOString(),
    trial_ends_at: sub?.trial_ends_at ?? null,
    trial_started_at: sub?.trial_started_at ?? now.toISOString(),
  });
}

export async function ensureTrialSubscription(
  supabase: Supabase,
  companyId: string,
): Promise<void> {
  const started = new Date();
  const trialEnd = trialEndsAtFromStart(started);
  await syncCompanyFromSubscription(supabase, companyId, {
    status: "trial",
    plan_slug: "trial",
    payment_status: "pending",
    trial_started_at: started.toISOString(),
    trial_ends_at: trialEnd.toISOString(),
    subscription_ends_at: null,
  });
}

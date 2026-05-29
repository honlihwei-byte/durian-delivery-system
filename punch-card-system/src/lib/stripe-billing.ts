import type Stripe from "stripe";
import {
  nextInvoiceNumber,
  syncCompanyFromSubscription,
  type SubscriptionRow,
} from "@/lib/billing";
import type { CompanyRecord, CompanyStatus } from "@/lib/company";
import { planSlugFromStripePriceId } from "@/lib/stripe-prices";
import { planBySlug, type PaymentStatus, type PlanSlug } from "@/lib/subscription-plans";
import type { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

type Supabase = ReturnType<typeof createAdminClient>;

function resolvePlanSlug(
  subscription: Stripe.Subscription,
  fallback?: string | null,
): PlanSlug {
  const metaSlug = subscription.metadata?.plan_slug?.trim();
  if (metaSlug) {
    const slug = metaSlug.toLowerCase();
    if (slug === "starter" || slug === "growth" || slug === "business") return slug;
  }
  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId) {
    const fromPrice = planSlugFromStripePriceId(priceId);
    if (fromPrice) return fromPrice;
  }
  if (fallback) {
    const slug = fallback.toLowerCase();
    if (slug === "starter" || slug === "growth" || slug === "business") return slug;
  }
  return "starter";
}

function mapStripeSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): {
  status: CompanyStatus;
  payment_status: PaymentStatus;
  active: boolean;
} {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return { status: "active", payment_status: "paid", active: true };
    case "past_due":
    case "unpaid":
      return { status: "suspended", payment_status: "overdue", active: false };
    case "canceled":
    case "incomplete_expired":
      return { status: "expired", payment_status: "overdue", active: false };
    case "paused":
      return { status: "suspended", payment_status: "overdue", active: false };
    default:
      return { status: "suspended", payment_status: "pending", active: false };
  }
}

export async function fetchCompanyByStripeCustomerId(
  supabase: Supabase,
  customerId: string,
): Promise<CompanyRecord | null> {
  const { data, error } = await supabase
    .from("companies")
    .select(
      "id, name, code, login_id, status, trial_started_at, trial_ends_at, subscription_ends_at, admin_pin, owner_name, phone, email, active, password_hash, auth_user_id, email_verified_at, timezone, billing_contact_email, billing_contact_phone, stripe_customer_id, stripe_subscription_id, created_at, updated_at",
    )
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (error || !data) return null;
  const { companyRowFromDb } = await import("@/lib/company");
  return companyRowFromDb(data as Record<string, unknown>);
}

export async function fetchCompanyByStripeSubscriptionId(
  supabase: Supabase,
  subscriptionId: string,
): Promise<CompanyRecord | null> {
  const { data, error } = await supabase
    .from("companies")
    .select(
      "id, name, code, login_id, status, trial_started_at, trial_ends_at, subscription_ends_at, admin_pin, owner_name, phone, email, active, password_hash, auth_user_id, email_verified_at, timezone, billing_contact_email, billing_contact_phone, stripe_customer_id, stripe_subscription_id, created_at, updated_at",
    )
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (error || !data) return null;
  const { companyRowFromDb } = await import("@/lib/company");
  return companyRowFromDb(data as Record<string, unknown>);
}

export async function resolveCompanyForStripeSubscription(
  supabase: Supabase,
  subscription: Stripe.Subscription,
  hints?: { companyId?: string | null; customerId?: string | null },
): Promise<CompanyRecord | null> {
  const companyId =
    hints?.companyId?.trim() ||
    subscription.metadata?.company_id?.trim() ||
    null;

  if (companyId) {
    const { fetchCompanyById } = await import("@/lib/company-db");
    const company = await fetchCompanyById(supabase, companyId);
    if (company) return company;
  }

  const customerId =
    hints?.customerId?.trim() ||
    (typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id) ||
    null;

  if (customerId) {
    const byCustomer = await fetchCompanyByStripeCustomerId(supabase, customerId);
    if (byCustomer) return byCustomer;
  }

  return fetchCompanyByStripeSubscriptionId(supabase, subscription.id);
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): number {
  const itemEnd = subscription.items.data[0]?.current_period_end;
  if (itemEnd) return itemEnd;
  const legacy = (subscription as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  if (legacy) return legacy;
  return Math.floor(Date.now() / 1000) + 30 * 86400;
}

/** Sync company + subscription rows from a Stripe subscription object. */
export async function applyStripeSubscription(
  supabase: Supabase,
  companyId: string,
  subscription: Stripe.Subscription,
  options?: { fallbackPlanSlug?: string | null },
): Promise<void> {
  const planSlug = resolvePlanSlug(subscription, options?.fallbackPlanSlug);
  const plan = planBySlug(planSlug);
  const periodEnd = new Date(subscriptionPeriodEnd(subscription) * 1000).toISOString();
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  const mapped = mapStripeSubscriptionStatus(subscription.status);

  await syncCompanyFromSubscription(supabase, companyId, {
    status: mapped.status,
    plan_slug: planSlug,
    payment_status: mapped.payment_status,
    subscription_ends_at: periodEnd,
    max_staff: plan?.maxStaff ?? null,
    max_shops: plan?.maxShops ?? null,
  });

  const companyPatch: Record<string, unknown> = {
    active: mapped.active,
    updated_at: new Date().toISOString(),
  };
  if (customerId) companyPatch.stripe_customer_id = customerId;
  if (subscription.status === "canceled") {
    companyPatch.stripe_subscription_id = null;
  } else {
    companyPatch.stripe_subscription_id = subscription.id;
  }

  await supabase.from("companies").update(companyPatch).eq("id", companyId);

  await supabase
    .from("subscriptions")
    .update({
      stripe_subscription_id: subscription.status === "canceled" ? null : subscription.id,
      stripe_price_id: priceId,
      next_billing_at: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId);
}

export async function recordStripeCheckoutPayment(
  supabase: Supabase,
  companyId: string,
  planSlug: PlanSlug,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const plan = planBySlug(planSlug);
  if (!plan?.amountCents) return;

  const reference = session.id;
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("company_id", companyId)
    .eq("reference_code", reference)
    .maybeSingle();

  if (existing) return;

  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      company_id: companyId,
      plan_slug: planSlug,
      amount_cents: plan.amountCents,
      currency: "MYR",
      status: "paid",
      payment_method: "stripe",
      reference_code: reference,
      paid_at: now,
      notes: `Stripe Checkout ${reference}`,
    })
    .select("id")
    .single();

  if (payErr || !payment) {
    console.error("Stripe payment record failed:", payErr);
    return;
  }

  await supabase.from("invoices").insert({
    company_id: companyId,
    payment_id: payment.id,
    invoice_number: nextInvoiceNumber(),
    plan_slug: planSlug,
    amount_cents: plan.amountCents,
    currency: "MYR",
    status: "paid",
    period_start: now,
    period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    paid_at: now,
  });
}

export async function ensureStripeCustomer(
  supabase: Supabase,
  company: CompanyRecord,
): Promise<string> {
  if (company.stripe_customer_id) {
    return company.stripe_customer_id;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: company.billing_contact_email?.trim() || company.email?.trim() || undefined,
    name: company.name,
    metadata: { company_id: company.id },
  });

  await supabase
    .from("companies")
    .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
    .eq("id", company.id);

  return customer.id;
}

export async function createStripeCheckoutSession(
  supabase: Supabase,
  company: CompanyRecord,
  planSlug: PlanSlug,
  priceId: string,
): Promise<string> {
  const { getAppBaseUrl } = await import("@/lib/supabase/auth-url");
  const stripe = getStripe();
  const customerId = await ensureStripeCustomer(supabase, company);
  const base = getAppBaseUrl();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/billing?checkout=success`,
    cancel_url: `${base}/billing?checkout=cancelled`,
    metadata: {
      company_id: company.id,
      plan_slug: planSlug,
    },
    subscription_data: {
      metadata: {
        company_id: company.id,
        plan_slug: planSlug,
      },
    },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    throw new Error("Stripe Checkout session URL missing");
  }
  return session.url;
}

export async function tryUpdateExistingStripePlan(
  supabase: Supabase,
  company: CompanyRecord,
  planSlug: PlanSlug,
  priceId: string,
): Promise<boolean> {
  if (!company.stripe_subscription_id) return false;

  const stripe = getStripe();
  let subscription: Stripe.Subscription;
  try {
    subscription = await stripe.subscriptions.retrieve(company.stripe_subscription_id);
  } catch {
    return false;
  }

  if (!["active", "trialing", "past_due"].includes(subscription.status)) {
    return false;
  }

  const itemId = subscription.items.data[0]?.id;
  if (!itemId) return false;

  const updated = await stripe.subscriptions.update(subscription.id, {
    items: [{ id: itemId, price: priceId }],
    metadata: {
      company_id: company.id,
      plan_slug: planSlug,
    },
    proration_behavior: "create_prorations",
  });

  await applyStripeSubscription(supabase, company.id, updated, { fallbackPlanSlug: planSlug });
  return true;
}

export type SubscriptionBillingDetails = Pick<
  SubscriptionRow,
  "plan_slug" | "payment_status" | "subscription_ends_at"
> & {
  next_billing_at: string | null;
  stripe_subscription_id: string | null;
};

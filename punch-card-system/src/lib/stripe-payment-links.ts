import { normalizePlanSlug, type PlanSlug } from "@/lib/subscription-plans";

type BillablePlan = Exclude<PlanSlug, "trial">;

/** Production Stripe Payment Links (one per plan). */
export const STRIPE_PAYMENT_LINKS: Record<BillablePlan, string> = {
  starter: "https://buy.stripe.com/eVqfZjctv47WdkK4Wc1Nu00",
  growth: "https://buy.stripe.com/28E5kFdxzbAo4OecoE1Nu01",
  business: "https://buy.stripe.com/aFa8wRfFHgUI6Wm3S81Nu02",
};

/** Optional env override keys (server-side). */
const LINK_ENV_KEYS: Record<BillablePlan, string[]> = {
  starter: ["STRIPE_PAYMENT_LINK_STARTER"],
  growth: ["STRIPE_PAYMENT_LINK_GROWTH"],
  business: ["STRIPE_PAYMENT_LINK_BUSINESS", "STRIPE_PAYMENT_LINK_PRO"],
};

export function stripePaymentLinkForPlan(slug: PlanSlug): string | null {
  const normalized = normalizePlanSlug(slug);
  if (normalized === "trial") return null;

  if (typeof process !== "undefined") {
    for (const envKey of LINK_ENV_KEYS[normalized]) {
      const value = process.env[envKey]?.trim();
      if (value) return value;
    }
  }

  return STRIPE_PAYMENT_LINKS[normalized];
}

export function stripePaymentLinksConfigured(): boolean {
  return (
    Boolean(stripePaymentLinkForPlan("starter")) &&
    Boolean(stripePaymentLinkForPlan("growth")) &&
    Boolean(stripePaymentLinkForPlan("business"))
  );
}

export function buildStripePaymentLinkUrl(
  baseLink: string,
  params: { clientReferenceId: string; email?: string | null },
): string {
  const url = new URL(baseLink);
  url.searchParams.set("client_reference_id", params.clientReferenceId);
  const email = params.email?.trim();
  if (email) {
    url.searchParams.set("prefilled_email", email);
  }
  return url.toString();
}

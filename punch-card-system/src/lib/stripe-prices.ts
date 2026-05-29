import { normalizePlanSlug, type PlanSlug } from "@/lib/subscription-plans";

const PRICE_ENV: Record<Exclude<PlanSlug, "trial">, string> = {
  starter: "STRIPE_PRICE_STARTER",
  growth: "STRIPE_PRICE_GROWTH",
  business: "STRIPE_PRICE_BUSINESS",
};

export function stripePriceIdForPlan(slug: PlanSlug): string | null {
  const normalized = normalizePlanSlug(slug);
  if (normalized === "trial") return null;
  const envKey = PRICE_ENV[normalized];
  const value = process.env[envKey]?.trim();
  return value || null;
}

export function planSlugFromStripePriceId(priceId: string): PlanSlug | null {
  const id = priceId.trim();
  for (const [slug, envKey] of Object.entries(PRICE_ENV) as [Exclude<PlanSlug, "trial">, string][]) {
    if (process.env[envKey]?.trim() === id) {
      return slug;
    }
  }
  return null;
}

export function stripePricesConfigured(): boolean {
  return (
    Boolean(stripePriceIdForPlan("starter")) &&
    Boolean(stripePriceIdForPlan("growth")) &&
    Boolean(stripePriceIdForPlan("business"))
  );
}

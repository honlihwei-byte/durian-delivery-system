/** SaaS plan catalog — limits by shops/staff only; all features included on every plan. */

export type PlanSlug = "trial" | "starter" | "growth" | "business";

/** Legacy slugs stored before plan rename (migration 035). */
export type LegacyPlanSlug = "multi_shop" | "enterprise";

export type PaymentStatus = "pending" | "paid" | "overdue";

export const WHATSAPP_SUPPORT =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT?.trim()) ||
  "60123456789";

export const ALL_PLAN_FEATURES = [
  "QR attendance",
  "GPS verification",
  "Indoor / high-rise mode",
  "Multiple GPS points",
  "Photo proof fallback",
  "Forgot punch request",
  "Fixed working time",
  "Shift scheduling",
  "Attendance reports",
  "Late / absent / overtime tracking",
  "Multi-shop dashboard",
  "Performance tracking",
] as const;

export const ADDON_EXTRA_SHOP_PRICE = "RM5/month";
export const ADDON_EXTRA_STAFF_PRICE = "RM5/month per 10 staff";

export type PlanDefinition = {
  slug: PlanSlug;
  name: string;
  priceLabel: string;
  amountCents: number;
  maxShops: number;
  maxStaff: number;
  description: string;
};

export const SUBSCRIPTION_PLANS: PlanDefinition[] = [
  {
    slug: "starter",
    name: "Starter",
    priceLabel: "RM29/month",
    amountCents: 2900,
    maxShops: 2,
    maxStaff: 15,
    description: "2 shops · 15 staff · Full features included",
  },
  {
    slug: "growth",
    name: "Growth",
    priceLabel: "RM59/month",
    amountCents: 5900,
    maxShops: 5,
    maxStaff: 50,
    description: "5 shops · 50 staff · Full features included",
  },
  {
    slug: "business",
    name: "Business",
    priceLabel: "RM99/month",
    amountCents: 9900,
    maxShops: 10,
    maxStaff: 100,
    description: "10 shops · 100 staff · Full features included",
  },
];

export function normalizePlanSlug(slug: string): PlanSlug | "trial" {
  const s = slug.trim().toLowerCase();
  if (s === "trial") return "trial";
  if (s === "multi_shop") return "business";
  if (s === "enterprise") return "business";
  if (s === "starter" || s === "growth" || s === "business") return s;
  return "starter";
}

export function planBySlug(slug: string): PlanDefinition | undefined {
  const normalized = normalizePlanSlug(slug);
  if (normalized === "trial") return undefined;
  return SUBSCRIPTION_PLANS.find((p) => p.slug === normalized);
}

export function planDisplayName(slug: string): string {
  if (slug === "trial") return "Trial";
  const normalized = normalizePlanSlug(slug);
  if (normalized === "trial") return "Trial";
  return planBySlug(slug)?.name ?? slug;
}

export function whatsAppPaymentUrl(companyName: string, planName: string, reference: string): string {
  const text = encodeURIComponent(
    `Hi, I would like to pay for OpsFlow Attendance.\nCompany: ${companyName}\nPlan: ${planName}\nRef: ${reference}`,
  );
  return `https://wa.me/${WHATSAPP_SUPPORT.replace(/\D/g, "")}?text=${text}`;
}

export const PLAN_LIMIT_MESSAGE =
  "You have reached your plan limit. Upgrade plan or add extra capacity.";

/** SaaS plan catalog (no payment gateway yet). */

export type PlanSlug = "trial" | "starter" | "business" | "multi_shop" | "enterprise";

export type PaymentStatus = "pending" | "paid" | "overdue";

export const WHATSAPP_SUPPORT =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT?.trim()) ||
  "60123456789";

export type PlanDefinition = {
  slug: PlanSlug;
  name: string;
  priceLabel: string;
  amountCents: number | null;
  maxStaff: number | null;
  description: string;
};

export const SUBSCRIPTION_PLANS: PlanDefinition[] = [
  {
    slug: "starter",
    name: "Starter",
    priceLabel: "RM29/month",
    amountCents: 2900,
    maxStaff: 10,
    description: "Up to 10 staff",
  },
  {
    slug: "business",
    name: "Business",
    priceLabel: "RM59/month",
    amountCents: 5900,
    maxStaff: 30,
    description: "Up to 30 staff",
  },
  {
    slug: "multi_shop",
    name: "Multi-shop",
    priceLabel: "RM99/month",
    amountCents: 9900,
    maxStaff: 100,
    description: "Up to 100 staff",
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    priceLabel: "Contact us",
    amountCents: null,
    maxStaff: null,
    description: "Custom limits",
  },
];

export function planBySlug(slug: string): PlanDefinition | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.slug === slug);
}

export function planDisplayName(slug: string): string {
  if (slug === "trial") return "Trial";
  return planBySlug(slug)?.name ?? slug;
}

export function whatsAppPaymentUrl(companyName: string, planName: string, reference: string): string {
  const text = encodeURIComponent(
    `Hi, I would like to pay for Punch Card System.\nCompany: ${companyName}\nPlan: ${planName}\nRef: ${reference}`,
  );
  return `https://wa.me/${WHATSAPP_SUPPORT.replace(/\D/g, "")}?text=${text}`;
}

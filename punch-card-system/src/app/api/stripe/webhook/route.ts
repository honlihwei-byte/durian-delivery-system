import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  applyStripeSubscription,
  recordStripeCheckoutPayment,
  resolveCompanyForStripeSubscription,
} from "@/lib/stripe-billing";
import { planSlugFromStripePriceId } from "@/lib/stripe-prices";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import type { PlanSlug } from "@/lib/subscription-plans";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== "subscription") return;

  const companyId =
    session.metadata?.company_id?.trim() || session.client_reference_id?.trim();
  if (!companyId) {
    console.error(
      "Stripe checkout.session.completed missing company_id (metadata or client_reference_id)",
    );
    return;
  }

  const supabase = createAdminClient();
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!subscriptionId) {
    console.error("Stripe checkout.session.completed missing subscription id");
    return;
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const priceId = subscription.items.data[0]?.price?.id;
  const planFromPrice = priceId ? planSlugFromStripePriceId(priceId) : null;
  const planSlug = (session.metadata?.plan_slug?.trim() ||
    planFromPrice ||
    "starter") as PlanSlug;

  await applyStripeSubscription(supabase, companyId, subscription, { fallbackPlanSlug: planSlug });
  await recordStripeCheckoutPayment(supabase, companyId, planSlug, session);
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription): Promise<void> {
  const supabase = createAdminClient();
  const company = await resolveCompanyForStripeSubscription(supabase, subscription);
  if (!company) {
    console.error("Stripe subscription event: company not found for", subscription.id);
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const fallbackPlan = priceId ? planSlugFromStripePriceId(priceId) : null;

  await applyStripeSubscription(supabase, company.id, subscription, {
    fallbackPlanSlug: fallbackPlan,
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, getStripeWebhookSecret());
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`Stripe webhook handler error (${event.type}):`, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

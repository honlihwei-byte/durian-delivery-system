"use client";

import { useState } from "react";
import { btnPrimary } from "@/components/marketing/MarketingShell";
import { stripePaymentLinkForPlan } from "@/lib/stripe-payment-links";
import type { PlanSlug } from "@/lib/subscription-plans";

type Props = {
  planSlug: PlanSlug;
  className?: string;
  disabled?: boolean;
};

export function SubscribeNowButton({ planSlug, className, disabled }: Props) {
  const [loading, setLoading] = useState(false);

  function handleSubscribe() {
    setLoading(true);
    try {
      const url = stripePaymentLinkForPlan(planSlug);
      if (!url) {
        alert("Payment link not available for this plan.");
        return;
      }
      window.open(url, "_blank");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={handleSubscribe}
      className={btnPrimary(className ?? "mt-4 w-full disabled:opacity-50")}
    >
      {loading ? "Opening payment…" : "Subscribe Now"}
    </button>
  );
}

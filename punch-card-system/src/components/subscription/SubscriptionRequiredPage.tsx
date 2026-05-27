"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/marketing/MarketingShell";
import {
  ADDON_EXTRA_SHOP_PRICE,
  ADDON_EXTRA_STAFF_PRICE,
  ALL_PLAN_FEATURES,
  SUBSCRIPTION_PLANS,
  type PlanSlug,
} from "@/lib/subscription-plans";

type SessionCompany = {
  name: string;
  company_id: string;
  status: string;
  status_label: string;
  plan_name: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  staff_count: number;
  shop_count: number;
};

export function SubscriptionRequiredPage() {
  const [company, setCompany] = useState<SessionCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [choosing, setChoosing] = useState<PlanSlug | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{
    reference: string;
    whatsapp_url: string;
    plan_name: string;
  } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/auth/session", { credentials: "include" });
    const j = await res.json();
    if (j.company) setCompany(j.company);
    setLoading(false);
    if (j.feature_access === "full") {
      window.location.href = "/admin";
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function choosePlan(slug: PlanSlug) {
    setChoosing(slug);
    try {
      const res = await fetch("/api/company/billing/choose-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan_slug: slug }),
      });
      const j = await res.json();
      if (!res.ok) {
        alert(j.error || "Could not start checkout");
        return;
      }
      if (j.whatsapp_url) {
        setPaymentInfo({
          reference: j.reference,
          whatsapp_url: j.whatsapp_url,
          plan_name: j.plan_name,
        });
        window.open(j.whatsapp_url, "_blank");
      }
    } finally {
      setChoosing(null);
    }
  }

  if (loading) {
    return <p className="py-20 text-center text-sm text-zinc-500">Loading…</p>;
  }

  const isTrialEnded =
    company?.status === "expired" &&
    company.trial_ends_at &&
    new Date(company.trial_ends_at).getTime() < Date.now();

  const headline = isTrialEnded
    ? "Your trial has ended. Your data is safe. Upgrade to continue using OpsFlow."
    : "Your subscription has expired. Your data is safe. Upgrade to continue using OpsFlow.";

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <header className="rounded-2xl border border-amber-200 bg-amber-50/90 p-6 dark:border-amber-900 dark:bg-amber-950/40">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200">
          Subscription required
        </p>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {company?.name ?? "Your company"}
        </h1>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{headline}</p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Status</dt>
            <dd className="font-semibold">{company?.status_label ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Current plan</dt>
            <dd className="font-semibold">{company?.plan_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Staff / shops</dt>
            <dd className="font-semibold">
              {company?.staff_count ?? 0} staff · {company?.shop_count ?? 0} shops
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Company ID</dt>
            <dd className="font-mono text-xs">{company?.company_id ?? "—"}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/billing" className={btnSecondary("text-sm")}>
            View billing
          </Link>
        </div>
      </header>

      {paymentInfo ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="font-semibold text-emerald-900 dark:text-emerald-100">
            Pending payment — {paymentInfo.plan_name}
          </p>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            Reference: <span className="font-mono">{paymentInfo.reference}</span>. Complete payment
            via WhatsApp; we will activate your account after confirmation.
          </p>
          <a
            href={paymentInfo.whatsapp_url}
            target="_blank"
            rel="noreferrer"
            className={`${btnPrimary("mt-4 inline-flex")}`}
          >
            Open WhatsApp
          </a>
        </div>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          All plans include full features
        </h2>
        <ul className="mt-3 grid gap-1 text-xs text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
          {ALL_PLAN_FEATURES.map((f) => (
            <li key={f}>✓ {f}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Available plans</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Simple pricing. No locked features. Need more? Add extra shop ({ADDON_EXTRA_SHOP_PRICE}) or
          staff ({ADDON_EXTRA_STAFF_PRICE}).
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div
              key={plan.slug}
              className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <h3 className="font-bold text-zinc-900 dark:text-zinc-50">{plan.name}</h3>
              <p className="mt-1 text-xl font-semibold text-emerald-700 dark:text-emerald-300">
                {plan.priceLabel}
              </p>
              <p className="mt-2 flex-1 text-sm text-zinc-600 dark:text-zinc-400">
                {plan.description}
              </p>
              <button
                type="button"
                disabled={choosing !== null}
                onClick={() => void choosePlan(plan.slug)}
                className={`${btnPrimary("mt-4 w-full disabled:opacity-50")}`}
              >
                {choosing === plan.slug ? "Please wait…" : `Choose ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

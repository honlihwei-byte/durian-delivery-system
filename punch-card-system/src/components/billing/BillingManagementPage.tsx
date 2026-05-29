"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/marketing/MarketingShell";
import { CancelSubscriptionModal } from "@/components/billing/CancelSubscriptionModal";
import { SubscribeNowButton } from "@/components/billing/SubscribeNowButton";
import { PageGuide } from "@/components/help/PageGuide";
import {
  ADDON_EXTRA_SHOP_PRICE,
  ADDON_EXTRA_STAFF_PRICE,
  ALL_PLAN_FEATURES,
  type PlanDefinition,
} from "@/lib/subscription-plans";

type BillingData = {
  company: { name: string; company_id: string };
  subscription: {
    plan_name: string;
    plan_slug: string;
    status: string;
    subscription_status: string;
    payment_status: string;
    trial_ends_at: string | null;
    subscription_ends_at: string | null;
    current_period_end: string | null;
    next_billing_at: string | null;
    renewal_date: string | null;
    cancel_at_period_end: boolean;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    staff_count: number;
    shop_count: number;
    staff_limit: number | null;
    shop_limit: number | null;
    extra_shops: number;
    extra_staff_packs: number;
  };
  can_manage_stripe: boolean;
  can_cancel_subscription: boolean;
  summary: { attendance_records: number };
  plans: PlanDefinition[];
  all_features: string[];
  payments: Array<{
    id: string;
    plan_slug: string;
    amount_cents: number;
    status: string;
    reference_code: string | null;
    created_at: string;
    paid_at: string | null;
  }>;
  invoices: Array<{
    id: string;
    invoice_number: string;
    plan_slug: string;
    amount_cents: number;
    status: string;
    issued_at: string;
    paid_at: string | null;
  }>;
};

function formatRm(cents: number) {
  return `RM${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

function limitLabel(used: number, limit: number | null): string {
  if (limit == null) return `${used} (unlimited)`;
  return `${used} / ${limit}`;
}

type Props = {
  title?: string;
};

export function BillingManagementPage({ title = "Billing" }: Props) {
  const [data, setData] = useState<BillingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const plansRef = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/company/billing", { credentials: "include" });
    const j = await res.json();
    if (!res.ok) {
      setError(j.error || "Failed to load billing");
      return;
    }
    setData(j);
    setError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openCustomerPortal() {
    setBusy("portal");
    setNotice(null);
    try {
      const res = await fetch("/api/company/billing/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ return_path: "/admin/billing" }),
      });
      const j = await res.json();
      if (!res.ok) {
        alert(j.error || "Could not open billing portal");
        return;
      }
      if (j.portal_url) window.open(j.portal_url, "_blank");
    } finally {
      setBusy(null);
    }
  }

  async function confirmCancelSubscription() {
    setBusy("cancel");
    try {
      const res = await fetch("/api/company/billing/cancel-subscription", {
        method: "POST",
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok) {
        alert(j.error || "Could not cancel subscription");
        return;
      }
      setNotice(j.message || "Subscription set to cancel at period end.");
      setShowCancelModal(false);
      await load();
    } finally {
      setBusy(null);
    }
  }

  function scrollToPlans() {
    plansRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  if (error) {
    return <p className="py-20 text-center text-sm text-red-600">{error}</p>;
  }

  if (!data) {
    return <p className="py-20 text-center text-sm text-zinc-500">Loading billing…</p>;
  }

  const { subscription: sub } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <PageGuide pageId="subscription" />
      <header>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{title}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {data.company.name} · {data.company.company_id}
        </p>
      </header>

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          {notice}
        </div>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Subscription management
        </h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Current plan</dt>
            <dd className="font-semibold">{sub.plan_name}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Subscription status</dt>
            <dd className="font-semibold">{sub.subscription_status}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Payment status</dt>
            <dd className="font-semibold capitalize">{sub.payment_status}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Next billing date</dt>
            <dd>{formatDate(sub.next_billing_at ?? sub.current_period_end)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Renewal date</dt>
            <dd>{formatDate(sub.renewal_date ?? sub.subscription_ends_at)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Shops / staff</dt>
            <dd>
              {limitLabel(sub.shop_count, sub.shop_limit)} ·{" "}
              {limitLabel(sub.staff_count, sub.staff_limit)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Stripe customer ID</dt>
            <dd className="font-mono text-xs break-all">{sub.stripe_customer_id ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Stripe subscription ID</dt>
            <dd className="font-mono text-xs break-all">{sub.stripe_subscription_id ?? "—"}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={scrollToPlans} className={btnPrimary("text-sm")}>
            Upgrade plan
          </button>
          {data.can_manage_stripe ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void openCustomerPortal()}
              className={btnSecondary("text-sm disabled:opacity-50")}
            >
              {busy === "portal" ? "Opening…" : "Manage billing"}
            </button>
          ) : null}
          {data.can_cancel_subscription ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => setShowCancelModal(true)}
              className={btnSecondary("text-sm text-red-700 dark:text-red-400 disabled:opacity-50")}
            >
              Cancel subscription
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Your data summary</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {sub.shop_count} shop(s), {sub.staff_count} staff,{" "}
          {data.summary.attendance_records.toLocaleString()} attendance record(s) on file.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">All plans include full features</h2>
        <ul className="mt-3 grid gap-1 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
          {(data.all_features ?? ALL_PLAN_FEATURES).map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="text-emerald-600">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </section>

      <section ref={plansRef}>
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Available plans</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Need more? Add extra shop ({ADDON_EXTRA_SHOP_PRICE}) or staff ({ADDON_EXTRA_STAFF_PRICE}).
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {data.plans.map((plan) => (
            <div
              key={plan.slug}
              className={`flex flex-col rounded-2xl border p-5 shadow-sm ${
                sub.plan_slug === plan.slug
                  ? "border-[#2563EB] ring-2 ring-[#2563EB]/20"
                  : "border-zinc-200 dark:border-zinc-800"
              } bg-white dark:bg-zinc-950`}
            >
              <h3 className="font-bold text-zinc-900 dark:text-zinc-50">{plan.name}</h3>
              <p className="mt-1 text-xl font-semibold text-emerald-700 dark:text-emerald-300">
                {plan.priceLabel}
              </p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{plan.description}</p>
              <SubscribeNowButton planSlug={plan.slug} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Payment history</h2>
        {data.payments.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No payments yet.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {data.payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900"
              >
                <span className="font-mono text-xs">{p.reference_code ?? p.id.slice(0, 8)}</span>
                <span>{formatRm(p.amount_cents)}</span>
                <span className="capitalize">{p.status}</span>
                <span className="text-zinc-500">{formatDate(p.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Invoices / receipts</h2>
        {data.invoices.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No invoices yet.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {data.invoices.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900"
              >
                <span className="font-mono text-xs">{inv.invoice_number}</span>
                <span>{formatRm(inv.amount_cents)}</span>
                <span className="capitalize">{inv.status}</span>
                <span className="text-zinc-500">{formatDate(inv.issued_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CancelSubscriptionModal
        open={showCancelModal}
        periodEnd={sub.current_period_end ?? sub.next_billing_at}
        busy={busy === "cancel"}
        onConfirm={() => void confirmCancelSubscription()}
        onClose={() => setShowCancelModal(false)}
      />
    </div>
  );
}

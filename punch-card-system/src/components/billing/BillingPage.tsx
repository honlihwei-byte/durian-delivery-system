"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { btnPrimary } from "@/components/marketing/MarketingShell";

type BillingData = {
  company: { name: string; company_id: string };
  subscription: {
    plan_name: string;
    status: string;
    payment_status: string;
    trial_ends_at: string | null;
    subscription_ends_at: string | null;
    staff_count: number;
    shop_count: number;
  };
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

export function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/company/billing", { credentials: "include" });
    const j = await res.json();
    if (!res.ok) {
      setError(j.error || "Failed to load billing");
      return;
    }
    setData(j);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return <p className="py-20 text-center text-sm text-red-600">{error}</p>;
  }

  if (!data) {
    return <p className="py-20 text-center text-sm text-zinc-500">Loading billing…</p>;
  }

  const { subscription: sub } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Billing</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {data.company.name} · {data.company.company_id}
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Current subscription
        </h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Plan</dt>
            <dd className="font-semibold">{sub.plan_name}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Payment status</dt>
            <dd className="font-semibold capitalize">{sub.payment_status}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Trial ends</dt>
            <dd>{formatDate(sub.trial_ends_at)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Subscription expires</dt>
            <dd>{formatDate(sub.subscription_ends_at)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Usage</dt>
            <dd>
              {sub.staff_count} staff · {sub.shop_count} shops
            </dd>
          </div>
        </dl>
        <Link href="/subscription-required" className={`${btnPrimary("mt-6 inline-flex")}`}>
          Change plan
        </Link>
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
    </div>
  );
}

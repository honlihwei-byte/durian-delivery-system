"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { btnPrimary } from "@/components/marketing/MarketingShell";

type BillingSummary = {
  plan_name: string;
  subscription_status: string;
};

export function BillingSuccessPage() {
  const [sub, setSub] = useState<BillingSummary | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/company/billing", { credentials: "include" });
    const j = await res.json();
    if (res.ok && j.subscription) {
      setSub({
        plan_name: j.subscription.plan_name,
        subscription_status: j.subscription.subscription_status,
      });
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-8 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/40">
        <p className="text-4xl" aria-hidden="true">
          ✓
        </p>
        <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Payment successful
        </h1>
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
          Your plan has been activated. If details below still show Trial, wait a few seconds —
          activation is applied automatically via Stripe.
        </p>
        <dl className="mt-6 space-y-2 rounded-xl bg-white/80 px-4 py-4 text-left text-sm dark:bg-zinc-900/60">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Current plan</dt>
            <dd className="font-semibold">{sub?.plan_name ?? "Loading…"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Subscription status</dt>
            <dd className="font-semibold">{sub?.subscription_status ?? "Loading…"}</dd>
          </div>
        </dl>
        <Link href="/admin" className={btnPrimary("mt-8 inline-flex")}>
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

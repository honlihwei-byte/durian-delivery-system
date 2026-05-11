"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { completeDemoPayment } from "@/actions/orders";
import type { OrderRow } from "@/types";

type Props = {
  order: OrderRow;
};

export function OrderPayClient({ order }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (order.status !== "pending") {
    return null;
  }

  async function pay() {
    setError(null);
    setLoading(true);
    const res = await completeDemoPayment(order.id);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-drive-line bg-drive-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-drive-muted">
          Online payment (placeholder)
        </h2>
        <p className="mt-2 text-sm text-drive-muted">
          Card entry is not connected. Use the button below to simulate a successful payment.
        </p>
        <div className="mt-4 space-y-3 opacity-60">
          <div>
            <span className="text-xs font-medium text-drive-muted">Card number</span>
            <div className="mt-1 rounded-xl border border-drive-line bg-drive-bg px-3 py-2.5 font-mono text-sm">
              •••• •••• •••• 4242
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs font-medium text-drive-muted">Expiry</span>
              <div className="mt-1 rounded-xl border border-drive-line bg-drive-bg px-3 py-2.5 text-sm">
                12 / 30
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-drive-muted">CVC</span>
              <div className="mt-1 rounded-xl border border-drive-line bg-drive-bg px-3 py-2.5 text-sm">
                •••
              </div>
            </div>
          </div>
        </div>
        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : null}
        <button
          type="button"
          onClick={pay}
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-drive-accent py-3 text-sm font-semibold text-white hover:bg-drive-accentMuted disabled:opacity-60"
        >
          {loading ? "Processing…" : `Pay $${Number(order.total).toFixed(2)} (demo)`}
        </button>
      </section>
    </div>
  );
}

"use client";

import { btnPrimary, btnSecondary } from "@/components/marketing/MarketingShell";

type Props = {
  open: boolean;
  periodEnd: string | null;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

function formatDate(iso: string | null) {
  if (!iso) return "the end of your current billing period";
  return new Date(iso).toLocaleDateString();
}

export function CancelSubscriptionModal({
  open,
  periodEnd,
  busy,
  onConfirm,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-subscription-title"
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
      >
        <h2 id="cancel-subscription-title" className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          Cancel subscription?
        </h2>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Your subscription will remain active until{" "}
          <strong>{formatDate(periodEnd)}</strong>. After that, your account will move to the Free
          plan and paid features will be disabled.
        </p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          You will not be charged again unless you resubscribe.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={btnPrimary("disabled:opacity-50")}
          >
            {busy ? "Cancelling…" : "Confirm cancellation"}
          </button>
          <button type="button" disabled={busy} onClick={onClose} className={btnSecondary()}>
            Keep subscription
          </button>
        </div>
      </div>
    </div>
  );
}

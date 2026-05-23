"use client";

import { useEffect, useState } from "react";
import {
  FORGOT_PUNCH_REASONS,
  type ForgotPunchRequestType,
} from "@/lib/forgot-punch";
import {
  malaysiaDatetimeLocalValue,
  parseMalaysiaDatetimeLocal,
} from "@/lib/malaysia-time";

type Props = {
  open: boolean;
  onClose: () => void;
  shopId: string;
  punchQrToken: string;
  staffId: string;
  staffIdentifier: string;
  useManualCode: boolean;
  suggestedType?: ForgotPunchRequestType | null;
  onSubmitted?: () => void;
};

export function ForgotPunchRequestDialog({
  open,
  onClose,
  shopId,
  punchQrToken,
  staffId,
  staffIdentifier,
  useManualCode,
  suggestedType,
  onSubmitted,
}: Props) {
  const [requestType, setRequestType] = useState<ForgotPunchRequestType>("forgot_clock_out");
  const [requestedTime, setRequestedTime] = useState(() => malaysiaDatetimeLocalValue());
  const [reason, setReason] = useState<string>(FORGOT_PUNCH_REASONS[0].value);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRequestType(suggestedType ?? "forgot_clock_out");
    setRequestedTime(malaysiaDatetimeLocalValue());
    setReason(FORGOT_PUNCH_REASONS[0].value);
    setNotes("");
    setError(null);
    setSuccess(null);
  }, [open, suggestedType]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsed = parseMalaysiaDatetimeLocal(requestedTime);
    if (!parsed) {
      setError("Enter a valid date and time.");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, string> = {
        shop_id: shopId,
        punch_qr_token: punchQrToken,
        request_type: requestType,
        requested_time: parsed.toISOString(),
        reason,
      };
      if (notes.trim()) body.notes = notes.trim();
      if (useManualCode) body.staff_identifier = staffIdentifier.trim();
      else body.staff_id = staffId;

      const res = await fetch("/api/forgot-punch-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { error?: string; request_type_label?: string; requested_display?: string };
      if (!res.ok) throw new Error(j.error || "Could not submit request");

      setSuccess(
        `${j.request_type_label ?? "Request"} submitted for ${j.requested_display ?? "review"}. An admin will approve it.`,
      );
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-punch-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-2">
          <h2 id="forgot-punch-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Forgot Punch Request
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Submit a correction if you forgot to clock in or out. Your manager will review it.
        </p>

        <form className="mt-4 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Request type</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="request_type"
                checked={requestType === "forgot_clock_in"}
                onChange={() => setRequestType("forgot_clock_in")}
              />
              Forgot Clock In
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="request_type"
                checked={requestType === "forgot_clock_out"}
                onChange={() => setRequestType("forgot_clock_out")}
              />
              Forgot Clock Out
            </label>
          </fieldset>

          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
            When did you punch? (Malaysia time)
            <input
              type="datetime-local"
              required
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-600 dark:bg-zinc-950"
              value={requestedTime}
              onChange={(e) => setRequestedTime(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Reason
            <select
              required
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {FORGOT_PUNCH_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Note <span className="font-normal text-zinc-500">(optional)</span>
            <textarea
              rows={3}
              maxLength={500}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any details for your manager"
            />
          </label>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
              {success}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={submitting || Boolean(success)}
              className="rounded-xl bg-teal-700 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit request"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-300 py-3 text-sm font-semibold dark:border-zinc-600"
            >
              {success ? "Close" : "Cancel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

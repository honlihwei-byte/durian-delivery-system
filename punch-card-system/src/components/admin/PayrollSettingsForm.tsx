"use client";

import { useCallback, useEffect, useState } from "react";
import { PAYROLL_MODE_LABELS, type PayrollMode } from "@/lib/payroll-mode";

export function PayrollSettingsForm() {
  const [payrollMode, setPayrollMode] = useState<PayrollMode>("scheduled_hours");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/company/payroll-settings", { credentials: "include" });
      const j = (await res.json()) as { payroll_mode?: PayrollMode; error?: string };
      if (!res.ok) throw new Error(j.error || "Failed to load payroll settings");
      if (j.payroll_mode) setPayrollMode(j.payroll_mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch("/api/company/payroll-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payroll_mode: payrollMode }),
      });
      const j = (await res.json()) as { message?: string; error?: string; details?: string };
      if (!res.ok) {
        const detail = j.details ? ` (${j.details})` : "";
        throw new Error((j.error || "Failed to save") + detail);
      }
      setSuccess(j.message ?? "Payroll settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save payroll settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading payroll settings…</p>;
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Payroll mode</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Payroll hours use scheduled shift length (early/late punches do not add paid time). Actual
        hours always reflect punch in/out duration.
      </p>
      <fieldset className="mt-4 space-y-2">
        {(["scheduled_hours", "actual_hours"] as const).map((mode) => (
          <label key={mode} className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="radio"
              name="payroll_mode"
              className="mt-0.5"
              checked={payrollMode === mode}
              onChange={() => setPayrollMode(mode)}
            />
            <span>
              {PAYROLL_MODE_LABELS[mode]}
              {mode === "scheduled_hours" ? (
                <span className="ml-1 text-xs text-emerald-600 dark:text-emerald-400">
                  (Recommended)
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? "Saving…" : "Save payroll mode"}
        </button>
        {success ? (
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300" role="status">
            {success}
          </p>
        ) : null}
        {error ? (
          <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Toast } from "@/components/Toast";
import { useAdminToast } from "@/components/admin/useAdminToast";

type DeviceMode = "allow_warn" | "require_approval" | "block_unknown";

export default function DeviceControlPage() {
  const [mode, setMode] = useState<DeviceMode>("allow_warn");
  const [deviceAvailable, setDeviceAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast, showSuccess, showError, showWarning, dismiss } = useAdminToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/company/anti-buddy-settings", { credentials: "include" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to load");
      setMode(j.settings?.device_enforcement_mode ?? "allow_warn");
      setDeviceAvailable(j.settings?.device_enforcement_available !== false);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/company/anti-buddy-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_enforcement_mode: mode }),
      });
      const j = await res.json();
      if (!res.ok) {
        const parts = [j.error, j.details, j.hint].filter(Boolean).join(" — ");
        throw new Error(parts || "Failed to save");
      }
      if (j.warning === "migration_required") {
        showWarning(
          j.message ??
            "Database migration required. Run 048_companies_security_columns_repair.sql in Supabase.",
        );
      } else {
        showSuccess(j.message ?? "Device control settings saved.");
      }
      if (j.settings?.device_enforcement_mode) setMode(j.settings.device_enforcement_mode);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <Link href="/admin/security" className="text-sm text-blue-600 underline dark:text-blue-400">
          ← Security Center
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Device Control</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          What happens when staff punch from a new or unapproved device.
        </p>
      </header>

      {!deviceAvailable && !loading ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Device enforcement column is missing in your database. Apply migration{" "}
          <code className="text-xs">048_companies_security_columns_repair.sql</code> in Supabase,
          then reload this page.
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Trusted device enforcement
            <select
              className="max-w-md rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              value={mode}
              onChange={(e) => setMode(e.target.value as DeviceMode)}
            >
              <option value="allow_warn">Allow + warning (default)</option>
              <option value="require_approval">Require manager approval</option>
              <option value="block_unknown">Block unknown devices</option>
            </select>
          </label>
          <div className="mt-4">
            <button
              type="button"
              disabled={saving || !deviceAvailable}
              onClick={() => void save()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </div>
      )}

      <Toast
        message={toast?.message ?? null}
        variant={toast?.variant === "warning" ? "warning" : toast?.variant ?? "success"}
        onDismiss={dismiss}
      />
    </div>
  );
}

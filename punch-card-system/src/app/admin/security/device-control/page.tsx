"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Settings = {
  device_enforcement_mode: "allow_warn" | "require_approval" | "block_unknown";
};

export default function DeviceControlPage() {
  const [settings, setSettings] = useState<Settings>({ device_enforcement_mode: "allow_warn" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/company/anti-buddy-settings", { credentials: "include" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to load");
      setSettings({ device_enforcement_mode: j.settings?.device_enforcement_mode ?? "allow_warn" });
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
      const res = await fetch("/api/company/anti-buddy-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to save");
      setSuccess(j.message ?? "Device control settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
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
      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Trusted device enforcement
            <select
              className="max-w-md rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              value={settings.device_enforcement_mode}
              onChange={(e) =>
                setSettings({
                  device_enforcement_mode: e.target.value as Settings["device_enforcement_mode"],
                })
              }
            >
              <option value="allow_warn">Allow + warning (default)</option>
              <option value="require_approval">Require manager approval</option>
              <option value="block_unknown">Block unknown devices</option>
            </select>
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
            {success ? <p className="text-xs text-emerald-700">{success}</p> : null}
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}

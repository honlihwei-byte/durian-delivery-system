"use client";

import { useCallback, useEffect, useState } from "react";

type Settings = {
  random_selfie_enabled: boolean;
  random_selfie_percent: 0 | 5 | 10 | 20;
  device_enforcement_mode: "allow_warn" | "require_approval" | "block_unknown";
};

export function AntiBuddySettingsForm() {
  const [settings, setSettings] = useState<Settings>({
    random_selfie_enabled: false,
    random_selfie_percent: 0,
    device_enforcement_mode: "allow_warn",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/company/anti-buddy-settings", { credentials: "include" });
      const j = (await res.json()) as { settings?: Settings; error?: string };
      if (!res.ok) throw new Error(j.error || "Failed to load");
      if (j.settings) setSettings(j.settings);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/company/anti-buddy-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const j = (await res.json()) as { settings?: Settings; error?: string };
      if (!res.ok) throw new Error(j.error || "Failed to save");
      if (j.settings) setSettings(j.settings);
      setMessage("Settings saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading anti-buddy settings…</p>;
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Random selfie check</h3>
      <p className="mt-1 text-xs text-zinc-500">
        When enabled, a random subset of punches will require a front-camera selfie before clock in/out.
      </p>
      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.random_selfie_enabled}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              random_selfie_enabled: e.target.checked,
              random_selfie_percent: e.target.checked && s.random_selfie_percent === 0 ? 10 : s.random_selfie_percent,
            }))
          }
          className="h-4 w-4 rounded border-zinc-300"
        />
        Enable random selfie check
      </label>
      <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Percentage of punches
        <select
          className="max-w-[8rem] rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          value={settings.random_selfie_percent}
          disabled={!settings.random_selfie_enabled}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              random_selfie_percent: Number(e.target.value) as Settings["random_selfie_percent"],
            }))
          }
        >
          <option value={0}>0%</option>
          <option value={5}>5%</option>
          <option value={10}>10%</option>
          <option value={20}>20%</option>
        </select>
      </label>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {message ? <p className="text-xs text-zinc-600 dark:text-zinc-400">{message}</p> : null}
      </div>

      <div className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Trusted device enforcement</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Controls what happens when a staff member punches from a new (unapproved) device.
        </p>
        <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Mode
          <select
            className="max-w-[16rem] rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={settings.device_enforcement_mode}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                device_enforcement_mode: e.target.value as Settings["device_enforcement_mode"],
              }))
            }
          >
            <option value="allow_warn">Allow + warning (default)</option>
            <option value="require_approval">Require manager approval</option>
            <option value="block_unknown">Block unknown devices</option>
          </select>
        </label>
      </div>
    </div>
  );
}

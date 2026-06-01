"use client";

import { useCallback, useEffect, useState } from "react";
import type { SelfieProofMode } from "@/lib/selfie-proof-policy";

type Settings = {
  selfie_proof_mode: SelfieProofMode;
  selfie_proof_random_percent: 0 | 5 | 10 | 20;
  device_enforcement_mode: "allow_warn" | "require_approval" | "block_unknown";
};

export function AntiBuddySettingsForm() {
  const [settings, setSettings] = useState<Settings>({
    selfie_proof_mode: "off",
    selfie_proof_random_percent: 0,
    device_enforcement_mode: "allow_warn",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/company/anti-buddy-settings", { credentials: "include" });
      const j = (await res.json()) as {
        settings?: Settings & {
          random_selfie_enabled?: boolean;
          random_selfie_percent?: number;
        };
        error?: string;
      };
      if (!res.ok) throw new Error(j.error || "Failed to load");
      if (j.settings) {
        let mode = j.settings.selfie_proof_mode ?? "off";
        if (mode === "off" && j.settings.random_selfie_enabled) mode = "random";
        setSettings({
          selfie_proof_mode: mode,
          selfie_proof_random_percent:
            j.settings.selfie_proof_random_percent ??
            (j.settings.random_selfie_percent as Settings["selfie_proof_random_percent"]) ??
            0,
          device_enforcement_mode: j.settings.device_enforcement_mode,
        });
      }
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
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/company/anti-buddy-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const j = (await res.json()) as {
        settings?: Settings;
        error?: string;
        details?: string;
        message?: string;
      };
      if (!res.ok) {
        const detail = j.details ? ` (${j.details})` : "";
        throw new Error((j.error || "Failed to save") + detail);
      }
      if (j.settings) setSettings(j.settings);
      setMessage(j.message ?? "Settings saved successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading anti-buddy settings…</p>;
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Require Selfie Proof for Punch
      </h3>
      <p className="mt-1 text-xs text-zinc-500">
        Front-camera selfie with name, shop, time, and punch action stamped on the image. Location
        photo proof still uses the rear camera separately.
      </p>
      <label className="mt-4 flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Mode
        <select
          className="max-w-[20rem] rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          value={settings.selfie_proof_mode}
          onChange={(e) => {
            const mode = e.target.value as SelfieProofMode;
            setSettings((s) => ({
              ...s,
              selfie_proof_mode: mode,
              selfie_proof_random_percent:
                mode === "random" && s.selfie_proof_random_percent === 0
                  ? 10
                  : s.selfie_proof_random_percent,
            }));
          }}
        >
          <option value="off">Off</option>
          <option value="always">Always required</option>
          <option value="risk">Only for new device / high risk</option>
          <option value="random">Random check percentage</option>
        </select>
      </label>
      {settings.selfie_proof_mode === "random" ? (
        <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Random check percentage
          <select
            className="max-w-[8rem] rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={settings.selfie_proof_random_percent}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                selfie_proof_random_percent: Number(e.target.value) as Settings["selfie_proof_random_percent"],
              }))
            }
          >
            <option value={5}>5%</option>
            <option value={10}>10%</option>
            <option value={20}>20%</option>
          </select>
        </label>
      ) : null}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {message ? (
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
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

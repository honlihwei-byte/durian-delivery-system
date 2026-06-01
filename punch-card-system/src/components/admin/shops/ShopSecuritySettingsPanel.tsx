"use client";

import { useCallback, useEffect, useState } from "react";
import type { ShopAntiBuddySettings } from "@/lib/shop-anti-buddy";
import {
  applySecurityToggles,
  securityTogglesFromShop,
  type ShopSecurityToggles,
} from "@/lib/shop-security-settings";
import { Toast } from "@/components/Toast";
import { useAdminToast } from "@/components/admin/useAdminToast";
import { HelpInfoIcon } from "@/components/help/HelpInfoIcon";

type Props = {
  shopId: string;
  disabled?: boolean;
};

export function ShopSecuritySettingsPanel({ shopId, disabled }: Props) {
  const [settings, setSettings] = useState<ShopAntiBuddySettings | null>(null);
  const [toggles, setToggles] = useState<ShopSecurityToggles | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast, showSuccess, showError, dismiss } = useAdminToast();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/shops/${encodeURIComponent(shopId)}/anti-buddy-settings`, {
        credentials: "include",
      });
      const j = (await res.json()) as { settings?: ShopAntiBuddySettings; error?: string };
      if (!res.ok) throw new Error(j.error || "Failed to load security settings");
      if (j.settings) {
        setSettings(j.settings);
        setToggles(securityTogglesFromShop(j.settings, j.settings.security_weak_gps_alert));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      setLoadError(msg);
      showError(msg);
      setSettings(null);
      setToggles(null);
    } finally {
      setLoading(false);
    }
  }, [shopId, showError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!toggles) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/shops/${encodeURIComponent(shopId)}/anti-buddy-settings`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toggles),
      });
      const j = (await res.json()) as {
        settings?: ShopAntiBuddySettings;
        error?: string;
        details?: string;
        hint?: string;
      };
      if (!res.ok) {
        const parts = [j.error, j.details, j.hint].filter(Boolean).join(" — ");
        throw new Error(parts || "Failed to save");
      }
      if (j.settings) {
        setSettings(j.settings);
        setToggles(securityTogglesFromShop(j.settings, j.settings.security_weak_gps_alert));
      }
      showSuccess("Security settings saved for this shop.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to save security settings");
    } finally {
      setSaving(false);
    }
  }

  function setToggle<K extends keyof ShopSecurityToggles>(key: K, value: ShopSecurityToggles[K]) {
    setToggles((t) => (t ? { ...t, [key]: value } : t));
    if (settings) {
      const next = applySecurityToggles(settings, { ...toggles!, [key]: value });
      setSettings(next);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading security settings…</p>
    );
  }

  if (!toggles) {
    return loadError ? <p className="text-sm text-red-600">{loadError}</p> : null;
  }

  const items: { key: keyof ShopSecurityToggles; label: string; desc: string }[] = [
    {
      key: "enable_selfie_verification",
      label: "Enable Selfie Verification",
      desc: "Require front-camera selfie when staff punch at this shop.",
    },
    {
      key: "enable_new_device_review",
      label: "Enable New Device Review",
      desc: "Flag punches from devices not seen before for manager review.",
    },
    {
      key: "enable_weak_gps_detection",
      label: "Enable Weak GPS Detection",
      desc: "Alert when GPS signal is weak (malls, high-rise retail floors).",
    },
    {
      key: "enable_buddy_punch_detection",
      label: "Enable Buddy Punch Detection",
      desc: "Detect shared devices, device switching, and rapid consecutive punches.",
    },
  ];

  return (
    <>
      <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
        <h3 className="flex items-center text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Security
          <HelpInfoIcon helpKey="antiBuddyProtection" />
        </h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Per-shop security controls. Each branch can use different verification rules.
        </p>

        <fieldset className="mt-4 space-y-3" disabled={disabled || saving}>
          {items.map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950"
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={toggles[item.key]}
                onChange={(e) => setToggle(item.key, e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {item.label}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500">{item.desc}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="mt-4">
          <button
            type="button"
            disabled={disabled || saving}
            onClick={() => void save()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {saving ? "Saving…" : "Save security settings"}
          </button>
        </div>
      </section>
      <Toast
        message={toast?.message ?? null}
        variant={toast?.variant ?? "success"}
        onDismiss={dismiss}
      />
    </>
  );
}

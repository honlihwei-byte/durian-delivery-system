"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { PERMISSION_GROUPS, ROLE_TEMPLATES, SHOP_SCOPES } from "@/lib/permissions/keys";
import type { PermissionKey, RoleTemplate, ShopScope } from "@/lib/permissions/keys";
import { ROLE_TEMPLATE_DEFAULTS } from "@/lib/permissions/templates";
import { resolveEffectivePermissions } from "@/lib/permissions/resolve";

type Shop = { id: string; name: string };

type ProfilePayload = {
  role_template: RoleTemplate;
  shop_scope: ShopScope;
  permission_overrides: Record<string, boolean>;
  scope_shop_ids: string[];
};

export function StaffPermissionsPanel({
  staffId,
  shops,
  onSaved,
}: {
  staffId: string;
  shops: Shop[];
  onSaved?: () => void;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfilePayload>({
    role_template: "staff",
    shop_scope: "assigned_only",
    permission_overrides: {},
    scope_shop_ids: [],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/${encodeURIComponent(staffId)}/permissions`, {
        credentials: "include",
      });
      const j = (await res.json()) as {
        error?: string;
        profile?: ProfilePayload & { scope_shop_ids?: string[] };
      };
      if (!res.ok) throw new Error(j.error || "Failed to load");
      if (j.profile) {
        setProfile({
          role_template: j.profile.role_template,
          shop_scope: j.profile.shop_scope,
          permission_overrides: j.profile.permission_overrides ?? {},
          scope_shop_ids: j.profile.scope_shop_ids ?? [],
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    void load();
  }, [load]);

  const effective = useMemo(
    () => resolveEffectivePermissions(profile),
    [profile],
  );

  function applyTemplate() {
    const defaults = ROLE_TEMPLATE_DEFAULTS[profile.role_template];
    setProfile((p) => ({
      ...p,
      shop_scope: defaults.shop_scope,
      permission_overrides: { ...defaults.permissions },
    }));
  }

  function togglePermission(key: PermissionKey, enabled: boolean) {
    setProfile((p) => ({
      ...p,
      permission_overrides: { ...p.permission_overrides, [key]: enabled },
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/${encodeURIComponent(staffId)}/permissions`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Failed to save");
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-xs text-zinc-500">{t("permissions.loading")}</p>;
  }

  return (
    <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
      <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">
        {t("permissions.title")}
      </p>
      <p className="text-[11px] text-blue-800/80 dark:text-blue-200/80">{t("permissions.notice")}</p>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {t("permissions.roleTemplate")}
        <select
          className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          value={profile.role_template}
          onChange={(e) =>
            setProfile((p) => ({ ...p, role_template: e.target.value as RoleTemplate }))
          }
        >
          {ROLE_TEMPLATES.map((r) => (
            <option key={r} value={r}>
              {t(`permissions.roles.${r}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {t("permissions.shopScope")}
        <select
          className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          value={profile.shop_scope}
          onChange={(e) =>
            setProfile((p) => ({ ...p, shop_scope: e.target.value as ShopScope }))
          }
        >
          {SHOP_SCOPES.map((s) => (
            <option key={s} value={s}>
              {t(`permissions.scopes.${s}`)}
            </option>
          ))}
        </select>
      </label>

      {profile.shop_scope === "selected_shops" ? (
        <fieldset className="max-h-32 space-y-1 overflow-y-auto rounded border border-zinc-200 p-2 text-xs dark:border-zinc-700">
          <legend className="px-1 font-semibold">{t("permissions.selectedShops")}</legend>
          {shops.map((shop) => (
            <label key={shop.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={profile.scope_shop_ids.includes(shop.id)}
                onChange={(e) => {
                  setProfile((p) => ({
                    ...p,
                    scope_shop_ids: e.target.checked
                      ? [...p.scope_shop_ids, shop.id]
                      : p.scope_shop_ids.filter((id) => id !== shop.id),
                  }));
                }}
              />
              {shop.name}
            </label>
          ))}
        </fieldset>
      ) : null}

      <button
        type="button"
        onClick={applyTemplate}
        className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold dark:border-zinc-600 dark:bg-zinc-900"
      >
        {t("permissions.applyTemplate")}
      </button>

      {(Object.keys(PERMISSION_GROUPS) as Array<keyof typeof PERMISSION_GROUPS>).map((group) => (
        <details key={group} className="rounded border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-950">
          <summary className="cursor-pointer text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            {t(`permissions.groups.${group}`)}
          </summary>
          <ul className="mt-2 space-y-1">
            {PERMISSION_GROUPS[group].map((key) => (
              <li key={key}>
                <label className="flex items-center gap-2 text-[11px] text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={effective[key as PermissionKey] === true}
                    onChange={(e) => togglePermission(key as PermissionKey, e.target.checked)}
                  />
                  {t(`permissions.keys.${key}`)}
                </label>
              </li>
            ))}
          </ul>
        </details>
      ))}

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {saving ? t("permissions.saving") : t("permissions.save")}
      </button>
    </div>
  );
}

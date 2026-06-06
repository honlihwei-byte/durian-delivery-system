"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { PERMISSION_GROUPS, ROLE_TEMPLATES, SHOP_SCOPES } from "@/lib/permissions/keys";
import type { PermissionGroup, PermissionKey, RoleTemplate, ShopScope } from "@/lib/permissions/keys";
import { ROLE_TEMPLATE_DEFAULTS } from "@/lib/permissions/templates";
import { resolveBasePermissions } from "@/lib/permissions/resolve";
import {
  ADVANCED_PERMISSION_GROUPS,
  permissionLabelKey,
  RECOMMENDED_PERMISSION_GROUPS,
  RECOMMENDED_PERMISSION_KEYS,
} from "@/lib/permissions/ui-config";

type CompanyPosition = {
  id: string;
  name: string;
  based_on_template: RoleTemplate;
  shop_scope: ShopScope;
  default_permissions: Record<string, boolean>;
  is_system: boolean;
  staff_count?: number;
};

type FormState = {
  name: string;
  based_on_template: RoleTemplate;
  shop_scope: ShopScope;
  default_permissions: Record<string, boolean>;
};

function advancedKeysForGroup(group: PermissionGroup): PermissionKey[] {
  const all = PERMISSION_GROUPS[group] as readonly PermissionKey[];
  if (ADVANCED_PERMISSION_GROUPS.includes(group)) return [...all];
  const highlighted = new Set(RECOMMENDED_PERMISSION_KEYS[group] ?? []);
  return all.filter((k) => !highlighted.has(k));
}

function emptyForm(): FormState {
  return {
    name: "",
    based_on_template: "staff",
    shop_scope: "assigned_only",
    default_permissions: {},
  };
}

export function PositionsManager() {
  const { t } = useI18n();
  const [positions, setPositions] = useState<CompanyPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/company/positions", { credentials: "include" });
      const j = (await res.json()) as { error?: string; positions?: CompanyPosition[] };
      if (!res.ok) throw new Error(j.error || "Failed to load");
      setPositions(j.positions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const previewPosition = useMemo(
    (): import("@/lib/permissions/company-positions-db").CompanyPosition => ({
      id: editingId ?? "preview",
      company_id: "",
      name: form.name,
      based_on_template: form.based_on_template,
      shop_scope: form.shop_scope,
      default_permissions: form.default_permissions,
      is_system: false,
      sort_order: 0,
      status: "active",
      created_at: "",
      updated_at: "",
    }),
    [form, editingId],
  );

  const effective = useMemo(
    () => resolveBasePermissions({ role_template: form.based_on_template, position: previewPosition }),
    [form.based_on_template, previewPosition],
  );

  function permissionLabel(key: PermissionKey): string {
    const path = permissionLabelKey(key);
    const label = t(path);
    return label === path ? key : label;
  }

  function startAdd() {
    setShowAdd(true);
    setEditingId(null);
    setForm(emptyForm());
    setNotice(null);
  }

  function startEdit(p: CompanyPosition) {
    setShowAdd(false);
    setEditingId(p.id);
    setForm({
      name: p.name,
      based_on_template: p.based_on_template,
      shop_scope: p.shop_scope,
      default_permissions: { ...p.default_permissions },
    });
    setNotice(null);
  }

  function cancelForm() {
    setShowAdd(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  function applyTemplate() {
    const defaults = ROLE_TEMPLATE_DEFAULTS[form.based_on_template];
    setForm((f) => ({
      ...f,
      shop_scope: defaults.shop_scope,
      default_permissions: {},
    }));
    setNotice(t("positions.applyTemplateHint"));
    window.setTimeout(() => setNotice(null), 2500);
  }

  function togglePermission(key: PermissionKey, enabled: boolean) {
    setForm((f) => ({
      ...f,
      default_permissions: { ...f.default_permissions, [key]: enabled },
    }));
  }

  function renderPermissionCheckboxes(keys: PermissionKey[]) {
    if (keys.length === 0) return null;
    return (
      <ul className="space-y-1">
        {keys.map((key) => (
          <li key={key}>
            <label className="flex items-center gap-2 text-[11px] text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={effective[key as PermissionKey] === true}
                onChange={(e) => togglePermission(key, e.target.checked)}
              />
              {permissionLabel(key)}
            </label>
          </li>
        ))}
      </ul>
    );
  }

  async function saveForm() {
    const name = form.name.trim();
    if (!name) {
      setError(t("positions.name"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const isNew = showAdd;
      const url = isNew
        ? "/api/company/positions"
        : `/api/company/positions/${encodeURIComponent(editingId!)}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Failed to save");
      setNotice(isNew ? t("positions.created") : t("positions.updated"));
      cancelForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function removePosition(id: string) {
    if (!window.confirm(t("positions.confirmDelete"))) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/company/positions/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error || t("positions.deleteBlocked"));
      setNotice(t("positions.deleted"));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  const advancedSections = [
    ...ADVANCED_PERMISSION_GROUPS,
    ...RECOMMENDED_PERMISSION_GROUPS.filter((g) => advancedKeysForGroup(g).length > 0),
  ];

  const formOpen = showAdd || editingId !== null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-2">
        <Link href="/admin/profile" className="text-sm font-medium text-blue-600 dark:text-blue-400">
          {t("positions.backSettings")}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{t("positions.title")}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("positions.subtitle")}</p>
          </div>
          {!formOpen ? (
            <button
              type="button"
              onClick={startAdd}
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {t("positions.addPosition")}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          {notice}
        </p>
      ) : null}

      {formOpen ? (
        <section className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
          <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            {showAdd ? t("positions.addPosition") : t("positions.editPosition")}
          </h2>

          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {t("positions.name")}
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t("positions.namePlaceholder")}
            />
          </label>

          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {t("positions.basedOnTemplate")}
            <select
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              value={form.based_on_template}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  based_on_template: e.target.value as RoleTemplate,
                }))
              }
              disabled={!showAdd && positions.find((p) => p.id === editingId)?.is_system}
            >
              {ROLE_TEMPLATES.map((r) => (
                <option key={r} value={r}>
                  {t(`permissions.roles.${r}`)}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[11px] text-zinc-500">{t("positions.basedOnHint")}</p>

          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {t("positions.shopScope")}
            <select
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              value={form.shop_scope}
              onChange={(e) =>
                setForm((f) => ({ ...f, shop_scope: e.target.value as ShopScope }))
              }
            >
              {SHOP_SCOPES.map((s) => (
                <option key={s} value={s}>
                  {t(`permissions.scopes.${s}`)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={applyTemplate}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold dark:border-zinc-600 dark:bg-zinc-900"
          >
            {t("positions.applyTemplate")}
          </button>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {t("positions.defaultPermissions")}
            </p>
            <p className="text-[11px] text-zinc-500">{t("positions.defaultPermissionsHint")}</p>
            {RECOMMENDED_PERMISSION_GROUPS.map((group) => {
              const keys = RECOMMENDED_PERMISSION_KEYS[group] ?? [];
              return (
                <div
                  key={group}
                  className="rounded border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-950"
                >
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {t(`permissions.groups.${group}`)}
                  </p>
                  <div className="mt-2">{renderPermissionCheckboxes(keys)}</div>
                </div>
              );
            })}
          </div>

          <details className="rounded border border-zinc-300 bg-white p-2 dark:border-zinc-600 dark:bg-zinc-950">
            <summary className="cursor-pointer text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {t("permissions.advancedTitle")}
            </summary>
            <div className="mt-2 space-y-2">
              {advancedSections.map((group) => {
                const keys = advancedKeysForGroup(group);
                if (keys.length === 0) return null;
                return (
                  <div key={group} className="rounded border border-zinc-100 p-2 dark:border-zinc-800">
                    <p className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      {t(`permissions.groups.${group}`)}
                    </p>
                    <div className="mt-1">{renderPermissionCheckboxes(keys)}</div>
                  </div>
                );
              })}
            </div>
          </details>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveForm()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? t("positions.saving") : t("positions.save")}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
            >
              {t("positions.cancel")}
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold dark:border-zinc-800">
          {t("positions.listTitle")}
        </h2>
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">{t("positions.loading")}</p>
        ) : positions.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">{t("positions.noPositions")}</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {positions.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">{p.name}</p>
                  <p className="text-xs text-zinc-500">
                    {t("positions.basedOnTemplate")}: {t(`permissions.roles.${p.based_on_template}`)} ·{" "}
                    {t(`permissions.scopes.${p.shop_scope}`)} ·{" "}
                    {p.is_system ? t("positions.systemDefault") : t("positions.customPosition")}
                    {(p.staff_count ?? 0) > 0
                      ? ` · ${t("positions.staffAssigned").replace("{count}", String(p.staff_count))}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
                  >
                    {t("positions.edit")}
                  </button>
                  {!p.is_system ? (
                    <button
                      type="button"
                      disabled={saving || (p.staff_count ?? 0) > 0}
                      title={(p.staff_count ?? 0) > 0 ? t("positions.deleteBlocked") : undefined}
                      onClick={() => void removePosition(p.id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-800 disabled:opacity-40 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                    >
                      {t("positions.delete")}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

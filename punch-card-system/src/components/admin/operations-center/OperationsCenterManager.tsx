"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { Toast } from "@/components/Toast";
import { useAdminToast } from "@/components/admin/useAdminToast";
import { TaskShopMultiSelect } from "@/components/admin/tasks/TaskShopMultiSelect";
import { dashboardCard, dashboardPrimaryBtn } from "@/components/admin/report/dashboard-ui";
import { malaysiaDateYmd } from "@/lib/malaysia-time";
import {
  OPERATIONS_PHASE1_TYPES,
  OPERATIONS_STATUSES,
  type OperationsContentListItem,
  type OperationsContentType,
  type OperationsDashboardStats,
  type OperationsPhase1Type,
  type OperationsStatus,
} from "@/lib/operations-center/types";

type Shop = { id: string; name: string };
type TabId = "dashboard" | "list" | "create";

async function readErr(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

function typeLabel(t: (key: string) => string, type: OperationsContentType): string {
  return t(`operationsCenter.types.${type}`);
}

function statusLabel(t: (key: string) => string, status: OperationsStatus): string {
  return t(`operationsCenter.status.${status}`);
}

export function OperationsCenterManager() {
  const { t } = useI18n();
  const { toast, showSuccess, showError, dismiss } = useAdminToast();
  const today = malaysiaDateYmd(new Date());

  const [tab, setTab] = useState<TabId>("dashboard");
  const [shops, setShops] = useState<Shop[]>([]);
  const [items, setItems] = useState<OperationsContentListItem[]>([]);
  const [stats, setStats] = useState<OperationsDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterShop, setFilterShop] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("published");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [createdContentId, setCreatedContentId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    content_type: "memo" as OperationsPhase1Type,
    target_all_shops: false,
    shop_ids: [] as string[],
    require_acknowledgement: true,
    publish_date: today,
    expiry_date: "",
    status: "draft" as OperationsStatus,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ include_shops: "true" });
      if (filterShop) qs.set("shop_id", filterShop);
      if (filterType) qs.set("content_type", filterType);
      if (filterStatus) qs.set("status", filterStatus);

      const [listRes, statsRes] = await Promise.all([
        fetch(`/api/admin/operations-center?${qs}`, { credentials: "include" }),
        fetch(
          `/api/admin/operations-center/stats?${new URLSearchParams({
            ...(filterShop ? { shop_id: filterShop } : {}),
            ...(filterType ? { content_type: filterType } : {}),
            ...(filterStatus ? { status: filterStatus } : {}),
          })}`,
          { credentials: "include" },
        ),
      ]);

      if (listRes.ok) {
        const j = (await listRes.json()) as {
          items?: OperationsContentListItem[];
          shops?: Shop[];
        };
        setItems(j.items ?? []);
        if (j.shops) setShops(j.shops);
      }
      if (statsRes.ok) {
        const j = (await statsRes.json()) as { stats?: OperationsDashboardStats };
        setStats(j.stats ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [filterShop, filterType, filterStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const detail = useMemo(
    () => items.find((i) => i.id === detailId) ?? null,
    [items, detailId],
  );

  async function submitContent(publishNow: boolean) {
    if (!form.title.trim()) {
      showError(t("operationsCenter.form.title"));
      return;
    }
    if (!form.target_all_shops && form.shop_ids.length === 0) {
      showError(t("tasks.form.noShopsSelected"));
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/operations-center", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          status: publishNow ? "published" : form.status,
          expiry_date: form.expiry_date || null,
        }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      const j = (await res.json()) as { item?: { id: string } };
      setCreatedContentId(j.item?.id ?? null);
      showSuccess(publishNow ? t("operationsCenter.form.published") : t("operationsCenter.form.created"));
      setTab("list");
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error");
    } finally {
      setCreating(false);
    }
  }

  async function uploadPdf(file: File, contentId: string) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("content_id", contentId);
      fd.set("file", file);
      const res = await fetch("/api/admin/operations-center/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) throw new Error(await readErr(res));
      showSuccess(t("operationsCenter.form.uploadPdf"));
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : t("operationsCenter.form.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function archiveContent(id: string) {
    const res = await fetch(`/api/admin/operations-center/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    if (!res.ok) {
      showError(await readErr(res));
      return;
    }
    showSuccess(t("operationsCenter.detail.deleted"));
    setDetailId(null);
    await load();
  }

  const statCards = [
    { label: t("operationsCenter.stats.totalPublished"), value: stats?.total_published ?? 0 },
    { label: t("operationsCenter.stats.readRate"), value: `${stats?.read_rate_pct ?? 0}%` },
    { label: t("operationsCenter.stats.unread"), value: stats?.unread_count ?? 0 },
    {
      label: t("operationsCenter.stats.acknowledgementRate"),
      value:
        stats?.acknowledgement_rate_pct != null ? `${stats.acknowledgement_rate_pct}%` : "—",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{t("operationsCenter.title")}</h1>
        <p className="text-sm text-zinc-500">{t("operationsCenter.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["dashboard", "list", "create"] as TabId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              tab === id
                ? "bg-violet-600 text-white"
                : "border border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900"
            }`}
          >
            {id === "dashboard"
              ? t("nav.dashboard")
              : id === "list"
                ? t("operationsCenter.title")
                : t("operationsCenter.form.createTitle")}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={filterShop}
          onChange={(e) => setFilterShop(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        >
          <option value="">{t("operationsCenter.filters.allShops")}</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        >
          <option value="">{t("operationsCenter.filters.allTypes")}</option>
          {OPERATIONS_PHASE1_TYPES.map((type) => (
            <option key={type} value={type}>
              {typeLabel(t, type)}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        >
          <option value="">{t("operationsCenter.filters.allStatuses")}</option>
          {OPERATIONS_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(t, s)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold"
        >
          {t("button.refresh")}
        </button>
      </div>

      {tab === "dashboard" ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.label} className={dashboardCard}>
              <p className="text-xs font-medium text-zinc-500">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{card.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "list" ? (
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-zinc-500">{t("common.loading")}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("operationsCenter.list.empty")}</p>
          ) : (
            items.map((item) => {
              const unread = Math.max(0, item.eligible_staff_count - item.read_count);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDetailId(item.id)}
                  className={`${dashboardCard} w-full text-left active:bg-zinc-50 dark:active:bg-zinc-800`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{item.title}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {typeLabel(t, item.content_type)} · {statusLabel(t, item.status)} ·{" "}
                        {item.publish_date}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                        {t("operationsCenter.list.readProgress")
                          .replace("{read}", String(item.read_count))
                          .replace("{total}", String(item.eligible_staff_count))}
                        {" · "}
                        {t("operationsCenter.detail.readStats")
                          .replace("{read}", String(item.read_count))
                          .replace("{total}", String(item.eligible_staff_count))
                          .replace("{unread}", String(unread))}
                      </p>
                    </div>
                    {item.require_acknowledgement ? (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                        ACK
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </div>
      ) : null}

      {tab === "create" ? (
        <div className={`${dashboardCard} space-y-3`}>
          <h2 className="font-semibold">{t("operationsCenter.form.createTitle")}</h2>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder={t("operationsCenter.form.title")}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder={t("operationsCenter.form.description")}
            rows={4}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
          <select
            value={form.content_type}
            onChange={(e) =>
              setForm((f) => ({ ...f, content_type: e.target.value as OperationsPhase1Type }))
            }
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          >
            {OPERATIONS_PHASE1_TYPES.map((type) => (
              <option key={type} value={type}>
                {typeLabel(t, type)}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.target_all_shops}
              onChange={(e) => setForm((f) => ({ ...f, target_all_shops: e.target.checked }))}
            />
            {t("operationsCenter.form.targetAllShops")}
          </label>

          {!form.target_all_shops ? (
            <TaskShopMultiSelect
              shops={shops}
              selectedIds={form.shop_ids}
              onChange={(shop_ids) => setForm((f) => ({ ...f, shop_ids }))}
            />
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.require_acknowledgement}
              onChange={(e) => setForm((f) => ({ ...f, require_acknowledgement: e.target.checked }))}
            />
            <span>
              {t("operationsCenter.form.requireAck")}
              <span className="block text-xs text-zinc-500">{t("operationsCenter.form.requireAckHint")}</span>
            </span>
          </label>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-sm">
              {t("operationsCenter.form.publishDate")}
              <input
                type="date"
                value={form.publish_date}
                onChange={(e) => setForm((f) => ({ ...f, publish_date: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="text-sm">
              {t("operationsCenter.form.expiryDate")}
              <input
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
          </div>

          {createdContentId ? (
            <div className="rounded-lg border border-dashed border-violet-300 bg-violet-50 p-3 dark:border-violet-700 dark:bg-violet-950/30">
              <p className="text-sm font-medium">{t("operationsCenter.form.attachments")}</p>
              <p className="text-xs text-zinc-500">{t("operationsCenter.form.uploadHint")}</p>
              <input
                type="file"
                accept="application/pdf"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && createdContentId) void uploadPdf(file, createdContentId);
                }}
                className="mt-2 block w-full text-sm"
              />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={creating}
              onClick={() => void submitContent(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold"
            >
              {creating ? t("operationsCenter.form.saving") : t("operationsCenter.form.saveDraft")}
            </button>
            <button
              type="button"
              disabled={creating}
              onClick={() => void submitContent(true)}
              className={dashboardPrimaryBtn}
            >
              {creating ? t("operationsCenter.form.saving") : t("operationsCenter.form.publish")}
            </button>
          </div>
        </div>
      ) : null}

      {detail ? (
        <div className={`${dashboardCard} space-y-2`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">{detail.title}</h3>
              <p className="text-xs text-zinc-500">
                {typeLabel(t, detail.content_type)} · {detail.shop_names.join(", ") || t("operationsCenter.form.targetAllShops")}
              </p>
            </div>
            <button type="button" onClick={() => setDetailId(null)} className="text-sm text-zinc-500">
              {t("button.cancel")}
            </button>
          </div>
          <p className="text-sm text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap">{detail.description}</p>
          <p className="text-xs text-zinc-500">
            {t("operationsCenter.detail.readStats")
              .replace("{read}", String(detail.read_count))
              .replace("{total}", String(detail.eligible_staff_count))
              .replace("{unread}", String(Math.max(0, detail.eligible_staff_count - detail.read_count)))}
          </p>
          {detail.require_acknowledgement ? (
            <p className="text-xs text-zinc-500">
              {t("operationsCenter.detail.ackStats")
                .replace("{ack}", String(detail.acknowledged_count))
                .replace("{total}", String(detail.eligible_staff_count))}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void archiveContent(detail.id)}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
          >
            {t("operationsCenter.detail.delete")}
          </button>
        </div>
      ) : null}

      <Toast message={toast?.message ?? null} variant={toast?.variant} onDismiss={dismiss} />
    </div>
  );
}

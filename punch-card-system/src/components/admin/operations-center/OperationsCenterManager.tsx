"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { Toast } from "@/components/Toast";
import { useAdminToast } from "@/components/admin/useAdminToast";
import { TaskShopMultiSelect } from "@/components/admin/tasks/TaskShopMultiSelect";
import { dashboardCard, dashboardPrimaryBtn } from "@/components/admin/report/dashboard-ui";
import { malaysiaDateYmd } from "@/lib/malaysia-time";
import {
  OPERATIONS_CONTENT_TYPES,
  OPERATIONS_STATUSES,
  type OperationsContentDetail,
  type OperationsContentListItem,
  type OperationsContentType,
  type OperationsDashboardStats,
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

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function OperationsCenterManager() {
  const { t } = useI18n();
  const { toast, showSuccess, showError, dismiss } = useAdminToast();
  const today = malaysiaDateYmd(new Date());

  const typeLabel = (type: OperationsContentType) => t(`operationsCenter.types.${type}`);
  const statusLabel = (status: OperationsStatus) => t(`operationsCenter.status.${status}`);

  const [tab, setTab] = useState<TabId>("dashboard");
  const [shops, setShops] = useState<Shop[]>([]);
  const [items, setItems] = useState<OperationsContentListItem[]>([]);
  const [stats, setStats] = useState<OperationsDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterShop, setFilterShop] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("published");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailFull, setDetailFull] = useState<OperationsContentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [createdContentId, setCreatedContentId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    content_type: "announcement" as OperationsContentType,
    target_all_shops: false,
    shop_ids: [] as string[],
    require_acknowledgement: false,
    require_task_completion: false,
    require_photo_proof: false,
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
        const j = (await listRes.json()) as { items?: OperationsContentListItem[]; shops?: Shop[] };
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

  useEffect(() => {
    if (!detailId) {
      setDetailFull(null);
      return;
    }
    setDetailLoading(true);
    void fetch(`/api/admin/operations-center/${detailId}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return;
        const j = (await res.json()) as { item?: OperationsContentDetail };
        setDetailFull(j.item ?? null);
      })
      .finally(() => setDetailLoading(false));
  }, [detailId]);

  const detail = useMemo(
    () => detailFull ?? items.find((i) => i.id === detailId) ?? null,
    [detailFull, items, detailId],
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
      if (publishNow) setTab("list");
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error");
    } finally {
      setCreating(false);
    }
  }

  async function uploadFile(file: File, contentId: string) {
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
      showSuccess(t("operationsCenter.form.uploadFile"));
      await load();
      if (detailId === contentId) {
        const dRes = await fetch(`/api/admin/operations-center/${contentId}`, { credentials: "include" });
        if (dRes.ok) {
          const j = (await dRes.json()) as { item?: OperationsContentDetail };
          setDetailFull(j.item ?? null);
        }
      }
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
    { label: t("operationsCenter.stats.totalRecipients"), value: stats?.total_recipients ?? 0 },
    { label: t("operationsCenter.stats.readCount"), value: stats?.read_count ?? 0 },
    { label: t("operationsCenter.stats.acknowledgedCount"), value: stats?.acknowledged_count ?? 0 },
    { label: t("operationsCenter.stats.pendingCount"), value: stats?.pending_count ?? 0 },
    {
      label: t("operationsCenter.stats.readRate"),
      value: `${stats?.read_rate_pct ?? 0}%`,
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
          {OPERATIONS_CONTENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {typeLabel(type)}
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
              {statusLabel(s)}
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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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
            items.map((item) => (
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
                      {typeLabel(item.content_type)} · {statusLabel(item.status)} · {item.publish_date}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                      {t("operationsCenter.list.readProgress")
                        .replace("{read}", String(item.read_count))
                        .replace("{total}", String(item.total_recipients))}
                      {" · "}
                      {t("operationsCenter.list.pendingProgress")
                        .replace("{pending}", String(item.pending_count))
                        .replace("{total}", String(item.total_recipients))}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {item.require_acknowledgement ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                        ACK
                      </span>
                    ) : null}
                    {item.require_task_completion ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-900">
                        TASK
                      </span>
                    ) : null}
                    {item.require_photo_proof ? (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-900">
                        PHOTO
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            ))
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
              setForm((f) => ({ ...f, content_type: e.target.value as OperationsContentType }))
            }
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          >
            {OPERATIONS_CONTENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {typeLabel(type)}
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

          {(
            [
              ["require_acknowledgement", "requireAck", "requireAckHint"],
              ["require_task_completion", "requireTask", "requireTaskHint"],
              ["require_photo_proof", "requirePhoto", "requirePhotoHint"],
            ] as const
          ).map(([key, labelKey, hintKey]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
              />
              <span>
                {t(`operationsCenter.form.${labelKey}`)}
                <span className="block text-xs text-zinc-500">
                  {t(`operationsCenter.form.${hintKey}`)}
                </span>
              </span>
            </label>
          ))}

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
                accept="application/pdf,image/jpeg,image/png,image/webp,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && createdContentId) void uploadFile(file, createdContentId);
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
        <div className={`${dashboardCard} space-y-3`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">{detail.title}</h3>
              <p className="text-xs text-zinc-500">
                {typeLabel(detail.content_type)} ·{" "}
                {detail.shop_names.join(", ") || t("operationsCenter.form.targetAllShops")}
              </p>
            </div>
            <button type="button" onClick={() => setDetailId(null)} className="text-sm text-zinc-500">
              {t("button.cancel")}
            </button>
          </div>
          <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">{detail.description}</p>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800">
              <p className="text-zinc-500">{t("operationsCenter.stats.totalRecipients")}</p>
              <p className="text-lg font-bold">{detail.total_recipients}</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800">
              <p className="text-zinc-500">{t("operationsCenter.stats.readCount")}</p>
              <p className="text-lg font-bold">{detail.read_count}</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800">
              <p className="text-zinc-500">{t("operationsCenter.stats.acknowledgedCount")}</p>
              <p className="text-lg font-bold">{detail.acknowledged_count}</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800">
              <p className="text-zinc-500">{t("operationsCenter.stats.pendingCount")}</p>
              <p className="text-lg font-bold">{detail.pending_count}</p>
            </div>
          </div>

          {"read_tracking" in detail && detail.read_tracking && detail.read_tracking.length > 0 ? (
            <div className="overflow-x-auto">
              <h4 className="mb-2 text-sm font-semibold">{t("operationsCenter.detail.trackingTitle")}</h4>
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="py-2 pr-3">{t("operationsCenter.detail.staff")}</th>
                    <th className="py-2 pr-3">{t("operationsCenter.detail.readAt")}</th>
                    <th className="py-2 pr-3">{t("operationsCenter.detail.ackAt")}</th>
                    <th className="py-2 pr-3">{t("operationsCenter.detail.taskAt")}</th>
                    <th className="py-2">{t("operationsCenter.detail.photoAt")}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.read_tracking.map((row) => (
                    <tr key={row.staff_id} className="border-b border-zinc-100">
                      <td className="py-2 pr-3">
                        {row.staff_name}
                        <span className="block text-zinc-400">{row.staff_code}</span>
                      </td>
                      <td className="py-2 pr-3">{fmtTime(row.first_viewed_at)}</td>
                      <td className="py-2 pr-3">{fmtTime(row.acknowledged_at)}</td>
                      <td className="py-2 pr-3">{fmtTime(row.task_completed_at)}</td>
                      <td className="py-2">
                        {row.photo_proof_url ? (
                          <a href={row.photo_proof_url} target="_blank" rel="noopener noreferrer" className="text-violet-600">
                            {fmtTime(row.photo_proof_uploaded_at)}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : detailLoading ? (
            <p className="text-sm text-zinc-500">{t("common.loading")}</p>
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

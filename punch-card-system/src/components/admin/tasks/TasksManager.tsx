"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { Toast } from "@/components/Toast";
import { useAdminToast } from "@/components/admin/useAdminToast";
import { TaskStatusBadge } from "@/components/admin/tasks/TaskStatusBadge";
import { dashboardCard, dashboardPrimaryBtn } from "@/components/admin/report/dashboard-ui";
import { malaysiaDateYmd } from "@/lib/malaysia-time";
import {
  FEEDBACK_REASON_TYPES,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_REPEAT_TYPES,
  TASK_STATUSES,
  type RetailTaskListItem,
  type TaskCategory,
  type TaskStatus,
} from "@/lib/retail-tasks/types";

type Shop = { id: string; name: string };
type EligibleStaff = {
  id: string;
  staff_name: string;
  staff_code: string;
  role_template?: string;
  other_shop?: boolean;
};

type DashboardStats = {
  today_total: number;
  pending: number;
  submitted: number;
  verified: number;
  overdue: number;
  exception_reported: number;
  pending_verification: number;
  shops_unfinished: number;
};

type TaskBundle = {
  task: RetailTaskListItem;
  submissions: Array<Record<string, unknown>>;
  feedback: Array<Record<string, unknown>>;
  activity: Array<{
    id: string;
    action_type: string;
    actor_name: string;
    actor_role: string;
    old_status: string | null;
    new_status: string | null;
    note: string | null;
    created_at: string;
  }>;
  verifications: Array<Record<string, unknown>>;
};

type TabId = "dashboard" | "all" | "create";

async function readErr(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export function TasksManager() {
  const { t } = useI18n();
  const { toast, showSuccess, showError, dismiss } = useAdminToast();
  const today = malaysiaDateYmd(new Date());

  const [tab, setTab] = useState<TabId>("dashboard");
  const [shops, setShops] = useState<Shop[]>([]);
  const [assignees, setAssignees] = useState<EligibleStaff[]>([]);
  const [verifiers, setVerifiers] = useState<EligibleStaff[]>([]);
  const [tasks, setTasks] = useState<RetailTaskListItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterShop, setFilterShop] = useState("");
  const [filterDate, setFilterDate] = useState(today);
  const [filterStatus, setFilterStatus] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TaskBundle | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "opening_checklist" as TaskCategory,
    shop_id: "",
    assigned_staff_id: "",
    verifier_staff_id: "",
    due_date: today,
    due_time: "09:00",
    repeat_type: "one_time",
    photo_required: true,
    gps_required: false,
    feedback_allowed: true,
    priority: "normal",
  });
  const [creating, setCreating] = useState(false);

  const loadEligibleStaff = useCallback(async () => {
    if (!form.shop_id) {
      setAssignees([]);
      setVerifiers([]);
      return;
    }
    const base = new URLSearchParams({ shop_id: form.shop_id });
    const assignQs = new URLSearchParams(base);
    assignQs.set("role", "assignee");
    const verifierQs = new URLSearchParams(base);
    verifierQs.set("role", "verifier");

    const [assignRes, verifierRes] = await Promise.all([
      fetch(`/api/staff/task-eligible?${assignQs}`, { credentials: "include" }),
      fetch(`/api/staff/task-eligible?${verifierQs}`, { credentials: "include" }),
    ]);
    if (assignRes.ok) {
      const j = (await assignRes.json()) as { staff?: EligibleStaff[] };
      setAssignees(j.staff ?? []);
    }
    if (verifierRes.ok) {
      const j = (await verifierRes.json()) as { staff?: EligibleStaff[] };
      setVerifiers(j.staff ?? []);
    }
  }, [form.shop_id]);

  const loadMeta = useCallback(async () => {
    const shopsRes = await fetch("/api/shops", { credentials: "include" });
    if (shopsRes.ok) {
      const j = (await shopsRes.json()) as { shops?: Shop[] };
      setShops(j.shops ?? []);
      if (!form.shop_id && (j.shops ?? []).length > 0) {
        setForm((f) => ({ ...f, shop_id: j.shops![0]!.id }));
      }
    }
  }, [form.shop_id]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ from: filterDate, to: filterDate });
      if (filterShop) qs.set("shop_id", filterShop);
      if (filterStatus) qs.set("status", filterStatus);
      const res = await fetch(`/api/admin/retail-tasks?${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error(await readErr(res));
      const j = (await res.json()) as { tasks?: RetailTaskListItem[] };
      setTasks(j.tasks ?? []);
    } catch (e) {
      showError(e instanceof Error ? e.message : t("tasks.form.failed"));
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterShop, filterStatus, showError, t]);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/retail-tasks/dashboard?date=${filterDate}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await readErr(res));
      const j = (await res.json()) as { stats?: DashboardStats };
      setStats(j.stats ?? null);
    } catch {
      setStats(null);
    }
  }, [filterDate]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void loadEligibleStaff();
  }, [loadEligibleStaff]);

  useEffect(() => {
    void loadTasks();
    void loadDashboard();
  }, [loadTasks, loadDashboard]);

  async function openDetail(taskId: string) {
    setDetailId(taskId);
    setDetail(null);
    setRejectReason("");
    try {
      const res = await fetch(`/api/admin/retail-tasks/${encodeURIComponent(taskId)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await readErr(res));
      setDetail((await res.json()) as TaskBundle);
    } catch (e) {
      showError(e instanceof Error ? e.message : t("tasks.form.failed"));
      setDetailId(null);
    }
  }

  async function verifyTask(decision: "approved" | "rejected") {
    if (!detailId) return;
    if (decision === "rejected" && !rejectReason.trim()) {
      showError(t("tasks.detail.rejectRequired"));
      return;
    }
    setDetailBusy(true);
    try {
      const res = await fetch(`/api/admin/retail-tasks/${encodeURIComponent(detailId)}/verify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, rejection_reason: rejectReason.trim() || undefined }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      showSuccess(decision === "approved" ? t("tasks.detail.verified") : t("tasks.detail.rejected"));
      await openDetail(detailId);
      void loadTasks();
      void loadDashboard();
    } catch (e) {
      showError(e instanceof Error ? e.message : t("tasks.form.failed"));
    } finally {
      setDetailBusy(false);
    }
  }

  async function deleteTask(taskId: string) {
    if (!window.confirm(t("tasks.list.deleteConfirm"))) return;
    try {
      const res = await fetch(`/api/admin/retail-tasks/${encodeURIComponent(taskId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await readErr(res));
      showSuccess(t("tasks.form.saved"));
      void loadTasks();
      void loadDashboard();
    } catch (e) {
      showError(e instanceof Error ? e.message : t("tasks.form.failed"));
    }
  }

  async function createTask() {
    if (!form.title.trim() || !form.shop_id) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/retail-tasks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          assigned_staff_id: form.assigned_staff_id || null,
          verifier_staff_id: form.verifier_staff_id || null,
        }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      showSuccess(t("tasks.form.saved"));
      setTab("all");
      setForm((f) => ({ ...f, title: "", description: "" }));
      void loadTasks();
      void loadDashboard();
    } catch (e) {
      showError(e instanceof Error ? e.message : t("tasks.form.failed"));
    } finally {
      setCreating(false);
    }
  }

  const completionRate =
    stats && stats.today_total > 0
      ? Math.round((stats.verified / stats.today_total) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <h1 className="text-2xl font-semibold text-[#0F172A]">{t("tasks.title")}</h1>
        <p className="mt-1 text-sm text-[#64748B]">{t("tasks.subtitle")}</p>
        <p className="mt-2 text-xs text-zinc-500">{t("tasks.whatsappNote")}</p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2">
        {(["dashboard", "all", "create"] as TabId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              tab === id
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {t(`tasks.tabs.${id}`)}
          </button>
        ))}
      </div>

      {tab === "dashboard" && stats ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: t("tasks.dashboard.todayTotal"), value: stats.today_total },
            { label: t("tasks.dashboard.pending"), value: stats.pending },
            { label: t("tasks.dashboard.submitted"), value: stats.submitted },
            { label: t("tasks.dashboard.verified"), value: stats.verified },
            { label: t("tasks.dashboard.overdue"), value: stats.overdue },
            { label: t("tasks.dashboard.exception"), value: stats.exception_reported },
            { label: t("tasks.dashboard.shopsUnfinished"), value: stats.shops_unfinished },
            {
              label: t("tasks.dashboard.completionRate"),
              value: `${completionRate}%`,
            },
          ].map((item) => (
            <div key={item.label} className={dashboardCard}>
              <p className="text-xs text-zinc-500">{item.label}</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {(tab === "dashboard" || tab === "all") && (
        <div className={`${dashboardCard} space-y-3`}>
          <div className="flex flex-wrap gap-2">
            <label className="text-xs text-zinc-500">
              {t("tasks.filters.date")}
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="ml-1 rounded border border-zinc-300 px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs text-zinc-500">
              {t("tasks.filters.shop")}
              <select
                value={filterShop}
                onChange={(e) => setFilterShop(e.target.value)}
                className="ml-1 rounded border border-zinc-300 px-2 py-1 text-sm"
              >
                <option value="">{t("tasks.filters.allShops")}</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-500">
              {t("tasks.filters.status")}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="ml-1 rounded border border-zinc-300 px-2 py-1 text-sm"
              >
                <option value="">{t("tasks.filters.allStatuses")}</option>
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`tasks.status.${s}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-500">{t("tasks.loading")}</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("tasks.list.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-zinc-500">
                    <th className="py-2 pr-2">{t("tasks.form.title")}</th>
                    <th className="py-2 pr-2">{t("tasks.filters.shop")}</th>
                    <th className="py-2 pr-2">{t("tasks.list.assigned")}</th>
                    <th className="py-2 pr-2">{t("tasks.list.due")}</th>
                    <th className="py-2 pr-2">{t("tasks.filters.status")}</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => {
                    const displayStatus = (task.display_status ?? task.status) as TaskStatus;
                    return (
                      <tr key={task.id} className="border-b border-zinc-100">
                        <td className="py-2 pr-2 font-medium">{task.title}</td>
                        <td className="py-2 pr-2">{task.shop_name}</td>
                        <td className="py-2 pr-2">
                          {task.assigned_staff_name ?? t("tasks.form.unassigned")}
                        </td>
                        <td className="py-2 pr-2">
                          {task.due_date}
                          {task.due_time ? ` ${task.due_time}` : ""}
                        </td>
                        <td className="py-2 pr-2">
                          <TaskStatusBadge status={displayStatus} />
                        </td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => void openDetail(task.id)}
                            className="text-xs font-semibold text-blue-600"
                          >
                            {t("tasks.list.view")}
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteTask(task.id)}
                            className="ml-2 text-xs font-semibold text-red-600"
                          >
                            {t("tasks.list.delete")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "create" && (
        <div className={`${dashboardCard} grid gap-3 sm:grid-cols-2`}>
          <label className="block text-sm">
            {t("tasks.form.title")}
            <input
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            {t("tasks.form.shop")}
            <select
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
              value={form.shop_id}
              onChange={(e) => setForm((f) => ({ ...f, shop_id: e.target.value }))}
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            {t("tasks.form.description")}
            <textarea
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            {t("tasks.form.category")}
            <select
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value as TaskCategory }))
              }
            >
              {TASK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`tasks.category.${c}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            {t("tasks.form.priority")}
            <select
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {t(`tasks.priority.${p}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            {t("tasks.form.assignStaff")}
            <select
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
              value={form.assigned_staff_id}
              onChange={(e) => setForm((f) => ({ ...f, assigned_staff_id: e.target.value }))}
            >
              <option value="">{t("tasks.form.unassigned")}</option>
              {assignees.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.staff_name} ({s.staff_code})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            {t("tasks.form.verifier")}
            <select
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
              value={form.verifier_staff_id}
              onChange={(e) => setForm((f) => ({ ...f, verifier_staff_id: e.target.value }))}
            >
              <option value="">{t("tasks.form.selectVerifier")}</option>
              {verifiers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.staff_name} ({s.staff_code})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            {t("tasks.form.dueDate")}
            <input
              type="date"
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            {t("tasks.form.dueTime")}
            <input
              type="time"
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
              value={form.due_time}
              onChange={(e) => setForm((f) => ({ ...f, due_time: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            {t("tasks.form.repeat")}
            <select
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
              value={form.repeat_type}
              onChange={(e) => setForm((f) => ({ ...f, repeat_type: e.target.value }))}
            >
              {TASK_REPEAT_TYPES.map((r) => (
                <option key={r} value={r}>
                  {t(`tasks.repeat.${r}`)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-2 text-sm sm:col-span-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.photo_required}
                onChange={(e) => setForm((f) => ({ ...f, photo_required: e.target.checked }))}
              />
              {t("tasks.form.photoRequired")}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.gps_required}
                onChange={(e) => setForm((f) => ({ ...f, gps_required: e.target.checked }))}
              />
              {t("tasks.form.gpsRequired")}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.feedback_allowed}
                onChange={(e) => setForm((f) => ({ ...f, feedback_allowed: e.target.checked }))}
              />
              {t("tasks.form.feedbackAllowed")}
            </label>
          </div>
          <button
            type="button"
            disabled={creating || !form.title.trim()}
            onClick={() => void createTask()}
            className={dashboardPrimaryBtn}
          >
            {creating ? t("tasks.form.creating") : t("tasks.form.create")}
          </button>
        </div>
      )}

      {detailId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-4 shadow-xl">
            {!detail ? (
              <p className="text-sm text-zinc-500">{t("tasks.loading")}</p>
            ) : (
              <>
                <h2 className="text-lg font-semibold">{detail.task.title}</h2>
                <p className="text-xs text-zinc-500">
                  {detail.task.shop_name} · {detail.task.due_date}
                  {detail.task.due_time ? ` ${detail.task.due_time}` : ""}
                </p>
                <div className="mt-2">
                  <TaskStatusBadge
                    status={(detail.task.display_status ?? detail.task.status) as TaskStatus}
                  />
                </div>
                {detail.task.description ? (
                  <p className="mt-3 text-sm text-zinc-700">{detail.task.description}</p>
                ) : null}

                {detail.task.status === "submitted" ? (
                  <div className="mt-4 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <textarea
                      className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                      placeholder={t("tasks.detail.rejectionReason")}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={detailBusy}
                        onClick={() => void verifyTask("approved")}
                        className="flex-1 rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                      >
                        {t("tasks.detail.approve")}
                      </button>
                      <button
                        type="button"
                        disabled={detailBusy}
                        onClick={() => void verifyTask("rejected")}
                        className="flex-1 rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white"
                      >
                        {t("tasks.detail.reject")}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase text-zinc-500">
                    {t("tasks.detail.activity")}
                  </p>
                  {detail.activity.length === 0 ? (
                    <p className="text-sm text-zinc-500">{t("tasks.detail.noActivity")}</p>
                  ) : (
                    <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs">
                      {detail.activity.map((a) => (
                        <li key={a.id} className="rounded bg-zinc-50 px-2 py-1">
                          <span className="font-semibold">
                            {t(`tasks.action.${a.action_type}` as `tasks.action.${string}`) ||
                              a.action_type}
                          </span>{" "}
                          — {a.actor_name} ({a.actor_role})
                          {a.note ? ` — ${a.note}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDetailId(null);
                    setDetail(null);
                  }}
                  className="mt-4 w-full rounded border border-zinc-300 px-3 py-2 text-sm font-semibold"
                >
                  {t("tasks.detail.close")}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <Toast message={toast?.message ?? null} variant={toast?.variant} onDismiss={dismiss} />
    </div>
  );
}

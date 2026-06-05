"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { TaskStatusBadge } from "@/components/admin/tasks/TaskStatusBadge";
import { compressPhotoProofImage } from "@/lib/photo-proof-compress";
import { getCachedGpsPosition } from "@/lib/geolocation-client";
import {
  FEEDBACK_REASON_TYPES,
  type RetailTaskListItem,
  type TaskStatus,
} from "@/lib/retail-tasks/types";

type Staff = { id: string; staff_name: string; staff_code: string };

async function readErr(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export function StaffTasksScreen({
  shopId,
  shopStaff,
}: {
  shopId: string;
  shopStaff: Staff[];
}) {
  const { t } = useI18n();
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [tasks, setTasks] = useState<RetailTaskListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exceptionTaskId, setExceptionTaskId] = useState<string | null>(null);
  const [reasonType, setReasonType] = useState(FEEDBACK_REASON_TYPES[0]);
  const [reasonText, setReasonText] = useState("");

  const load = useCallback(async () => {
    if (!selectedStaffId) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ staff_id: selectedStaffId });
      const res = await fetch(
        `/api/shops/${encodeURIComponent(shopId)}/retail-tasks?${qs}`,
      );
      if (!res.ok) throw new Error(await readErr(res));
      const j = (await res.json()) as { tasks?: RetailTaskListItem[] };
      setTasks(j.tasks ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("tasks.form.failed"));
    } finally {
      setLoading(false);
    }
  }, [selectedStaffId, shopId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadPhoto(taskId: string, file: File): Promise<string> {
    const compressed = await compressPhotoProofImage(file);
    const form = new FormData();
    form.set("staff_id", selectedStaffId);
    form.set("task_id", taskId);
    form.set("file", compressed.file, "task-proof.jpg");
    const res = await fetch(
      `/api/shops/${encodeURIComponent(shopId)}/retail-tasks/photo-upload`,
      { method: "POST", body: form },
    );
    if (!res.ok) throw new Error(await readErr(res));
    const j = (await res.json()) as { photo_url?: string };
    if (!j.photo_url) throw new Error("Upload failed");
    return j.photo_url;
  }

  async function taskAction(
    taskId: string,
    action: string,
    extra: Record<string, unknown> = {},
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/shops/${encodeURIComponent(shopId)}/retail-tasks/${encodeURIComponent(taskId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staff_id: selectedStaffId, action, ...extra }),
        },
      );
      if (!res.ok) throw new Error(await readErr(res));
      setActiveTaskId(null);
      setComment("");
      setPhotoPath(null);
      setExceptionTaskId(null);
      setReasonText("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("tasks.form.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(task: RetailTaskListItem) {
    let path = photoPath;
    if (task.photo_required) {
      const input = document.getElementById(`task-photo-${task.id}`) as HTMLInputElement | null;
      const file = input?.files?.[0];
      if (!file) {
        setError(t("tasks.staff.takePhoto"));
        return;
      }
      setError(t("tasks.staff.uploading"));
      path = await uploadPhoto(task.id, file);
      setPhotoPath(path);
    }

    const gps = getCachedGpsPosition();
    await taskAction(task.id, "submit", {
      photo_url: path,
      comment: comment.trim() || undefined,
      staff_latitude: gps?.latitude,
      staff_longitude: gps?.longitude,
      gps_accuracy_meters: gps?.accuracyMeters,
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <header>
        <h1 className="text-xl font-bold text-zinc-900">{t("tasks.staff.title")}</h1>
        <p className="text-sm text-zinc-500">{t("tasks.staff.subtitle")}</p>
      </header>

      <label className="block text-sm">
        {t("tasks.staff.selectStaff")}
        <select
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          value={selectedStaffId}
          onChange={(e) => setSelectedStaffId(e.target.value)}
        >
          <option value="">—</option>
          {shopStaff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.staff_name} ({s.staff_code})
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-zinc-500">{t("tasks.loading")}</p> : null}

      {!selectedStaffId ? null : tasks.length === 0 && !loading ? (
        <p className="text-sm text-zinc-500">{t("tasks.staff.noTasks")}</p>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => {
            const status = (task.display_status ?? task.status) as TaskStatus;
            const isOpen = activeTaskId === task.id;
            const isException = exceptionTaskId === task.id;
            return (
              <li key={task.id} className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-zinc-900">{task.title}</p>
                    <p className="text-xs text-zinc-500">
                      {task.due_date}
                      {task.due_time ? ` · ${task.due_time}` : ""}
                    </p>
                  </div>
                  <TaskStatusBadge status={status} />
                </div>

                {isOpen ? (
                  <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
                    {task.photo_required ? (
                      <label className="block text-xs">
                        {t("tasks.staff.takePhoto")}
                        <input
                          id={`task-photo-${task.id}`}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="mt-1 w-full text-sm"
                        />
                      </label>
                    ) : null}
                    <textarea
                      className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                      placeholder={t("tasks.staff.comment")}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleSubmit(task)}
                      className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                    >
                      {t("tasks.staff.submit")}
                    </button>
                  </div>
                ) : isException ? (
                  <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
                    <select
                      className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                      value={reasonType}
                      onChange={(e) => setReasonType(e.target.value as typeof reasonType)}
                    >
                      {FEEDBACK_REASON_TYPES.map((r) => (
                        <option key={r} value={r}>
                          {t(`tasks.feedbackReason.${r}`)}
                        </option>
                      ))}
                    </select>
                    <textarea
                      className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                      placeholder={t("tasks.staff.explanation")}
                      value={reasonText}
                      onChange={(e) => setReasonText(e.target.value)}
                    />
                    <button
                      type="button"
                      disabled={busy || !reasonText.trim()}
                      onClick={() =>
                        void taskAction(task.id, "exception", {
                          reason_type: reasonType,
                          reason_text: reasonText.trim(),
                        })
                      }
                      className="w-full rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white"
                    >
                      {t("tasks.staff.reportException")}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(status === "pending" || status === "rejected") && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void taskAction(task.id, "start")}
                        className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        {t("tasks.staff.start")}
                      </button>
                    )}
                    {(status === "in_progress" || status === "pending" || status === "rejected") && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setActiveTaskId(task.id);
                          setExceptionTaskId(null);
                        }}
                        className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        {t("tasks.staff.submit")}
                      </button>
                    )}
                    {task.feedback_allowed && status !== "verified" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setExceptionTaskId(task.id);
                          setActiveTaskId(null);
                        }}
                        className="rounded border border-purple-300 px-3 py-1.5 text-xs font-semibold text-purple-800"
                      >
                        {t("tasks.staff.reportException")}
                      </button>
                    )}
                    {status === "submitted" && task.verifier_staff_id === selectedStaffId && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void taskAction(task.id, "verify", { decision: "approved" })
                          }
                          className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          {t("tasks.detail.approve")}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            const reason = window.prompt(t("tasks.detail.rejectionReason"));
                            if (reason) void taskAction(task.id, "verify", { decision: "rejected", rejection_reason: reason });
                          }}
                          className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          {t("tasks.detail.reject")}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import { malaysiaDateYmd } from "@/lib/malaysia-time";
import type { TaskStatus } from "@/lib/retail-tasks/types";

export function isTaskOverdue(
  dueDate: string,
  dueTime: string | null,
  status: TaskStatus,
  now = new Date(),
): boolean {
  if (status === "verified" || status === "exception_reported") return false;
  const active = ["pending", "in_progress", "submitted", "rejected"].includes(status);
  if (!active) return false;

  const timePart = dueTime ? String(dueTime).slice(0, 5) : "23:59";
  const due = new Date(`${dueDate}T${timePart}:00+08:00`);
  return now.getTime() > due.getTime();
}

export function displayTaskStatus(
  status: TaskStatus,
  dueDate: string,
  dueTime: string | null,
): TaskStatus {
  if (isTaskOverdue(dueDate, dueTime, status)) return "overdue";
  return status;
}

export const TASK_STATUS_CLASSES: Record<TaskStatus, string> = {
  pending: "bg-zinc-100 text-zinc-700 border-zinc-200",
  in_progress: "bg-blue-100 text-blue-900 border-blue-200",
  submitted: "bg-amber-100 text-amber-900 border-amber-200",
  verified: "bg-emerald-100 text-emerald-900 border-emerald-200",
  rejected: "bg-red-100 text-red-900 border-red-200",
  overdue: "bg-orange-100 text-orange-900 border-orange-200",
  exception_reported: "bg-purple-100 text-purple-900 border-purple-200",
};

export function todayYmd(): string {
  return malaysiaDateYmd(new Date());
}

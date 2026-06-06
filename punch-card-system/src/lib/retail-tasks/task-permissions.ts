import {
  canAccessShop,
  hasPermission,
  type StaffPermissionProfile,
} from "@/lib/permissions/resolve";
import type { RetailTaskRow } from "@/lib/retail-tasks/types";
import { isTaskPastDueDate } from "@/lib/retail-tasks/task-status";

export type TaskActor =
  | { kind: "admin"; name: string; role: "company_admin" }
  | {
      kind: "staff";
      staffId: string;
      name: string;
      profile: StaffPermissionProfile;
    };

export function canAdminManageTasks(actor: TaskActor): boolean {
  return actor.kind === "admin";
}

export function canViewTask(
  task: Pick<RetailTaskRow, "shop_id" | "assigned_staff_id" | "verifier_staff_id">,
  actor: TaskActor,
): boolean {
  if (actor.kind === "admin") return true;
  const { profile } = actor;
  if (!canAccessShop(profile, task.shop_id)) return false;
  if (task.assigned_staff_id === actor.staffId) return hasPermission(profile, "tasks.view_own");
  if (task.verifier_staff_id === actor.staffId) return true;
  if (hasPermission(profile, "tasks.view_shop")) return true;
  if (!task.assigned_staff_id && hasPermission(profile, "tasks.submit_proof")) return true;
  return false;
}

export function canSubmitTask(
  task: Pick<RetailTaskRow, "shop_id" | "assigned_staff_id" | "status" | "due_date" | "due_time">,
  actor: TaskActor,
): boolean {
  if (actor.kind === "admin") return false;
  if (!hasPermission(actor.profile, "tasks.submit_proof")) return false;
  if (!canAccessShop(actor.profile, task.shop_id)) return false;
  if (!["pending", "in_progress", "rejected"].includes(task.status)) return false;
  if (isTaskPastDueDate(task.due_date, task.due_time)) return false;
  if (task.assigned_staff_id && task.assigned_staff_id !== actor.staffId) return false;
  return true;
}

export function canVerifyTask(
  task: Pick<RetailTaskRow, "verifier_staff_id" | "status" | "shop_id">,
  actor: TaskActor,
): boolean {
  if (task.status !== "submitted") return false;
  if (actor.kind === "admin") return true;
  const canVerify =
    hasPermission(actor.profile, "tasks.verify_proof") ||
    hasPermission(actor.profile, "tasks.approve");
  if (!canVerify) return false;
  if (!canAccessShop(actor.profile, task.shop_id)) return false;
  if (task.verifier_staff_id && task.verifier_staff_id !== actor.staffId) return false;
  return true;
}

export function canReportException(
  task: Pick<RetailTaskRow, "shop_id" | "assigned_staff_id" | "feedback_allowed" | "status">,
  actor: TaskActor,
): boolean {
  if (!task.feedback_allowed) return false;
  if (task.status === "verified") return false;
  if (actor.kind === "admin") return true;
  if (!hasPermission(actor.profile, "tasks.exception_submit")) return false;
  if (!canAccessShop(actor.profile, task.shop_id)) return false;
  if (task.assigned_staff_id && task.assigned_staff_id !== actor.staffId) {
    return hasPermission(actor.profile, "tasks.exception_review");
  }
  return true;
}

export function canStartTask(
  task: Pick<RetailTaskRow, "shop_id" | "assigned_staff_id" | "status" | "due_date" | "due_time">,
  actor: TaskActor,
): boolean {
  if (actor.kind === "admin") return false;
  if (task.status !== "pending" && task.status !== "rejected") return false;
  if (isTaskPastDueDate(task.due_date, task.due_time)) return false;
  return canSubmitTask(task, actor);
}

export function canSaveTaskDraft(
  task: Pick<RetailTaskRow, "shop_id" | "assigned_staff_id" | "status" | "due_date" | "due_time">,
  actor: TaskActor,
): boolean {
  if (task.status !== "in_progress") return false;
  if (isTaskPastDueDate(task.due_date, task.due_time)) return false;
  return canSubmitTask(task, actor);
}

export function canResumeTask(
  task: Pick<RetailTaskRow, "shop_id" | "assigned_staff_id" | "status" | "due_date" | "due_time">,
  actor: TaskActor,
): boolean {
  return canSaveTaskDraft(task, actor);
}

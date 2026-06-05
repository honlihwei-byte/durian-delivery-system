import type { TaskStaffRole } from "@/lib/retail-tasks/types";
import type { RetailTaskRow } from "@/lib/retail-tasks/types";

export type TaskActor =
  | { kind: "admin"; name: string; role: "company_admin" }
  | { kind: "staff"; staffId: string; name: string; taskRole: TaskStaffRole; shopIds: string[] };

export function canAdminManageTasks(actor: TaskActor): boolean {
  return actor.kind === "admin";
}

export function canViewTask(
  task: Pick<RetailTaskRow, "shop_id" | "assigned_staff_id" | "verifier_staff_id">,
  actor: TaskActor,
): boolean {
  if (actor.kind === "admin") return true;
  if (!actor.shopIds.includes(task.shop_id)) return false;
  if (task.assigned_staff_id === actor.staffId) return true;
  if (task.verifier_staff_id === actor.staffId) return true;
  if (!task.assigned_staff_id && actor.taskRole !== "staff") return true;
  if (actor.taskRole === "manager" || actor.taskRole === "supervisor") {
    return actor.shopIds.includes(task.shop_id);
  }
  return false;
}

export function canSubmitTask(
  task: Pick<RetailTaskRow, "shop_id" | "assigned_staff_id" | "status">,
  actor: TaskActor,
): boolean {
  if (actor.kind === "admin") return false;
  if (!actor.shopIds.includes(task.shop_id)) return false;
  if (!["pending", "in_progress", "rejected"].includes(task.status)) return false;
  if (task.assigned_staff_id && task.assigned_staff_id !== actor.staffId) return false;
  return true;
}

export function canVerifyTask(
  task: Pick<RetailTaskRow, "verifier_staff_id" | "status">,
  actor: TaskActor,
): boolean {
  if (task.status !== "submitted") return false;
  if (actor.kind === "admin") return true;
  return task.verifier_staff_id === actor.staffId;
}

export function canReportException(
  task: Pick<RetailTaskRow, "shop_id" | "assigned_staff_id" | "feedback_allowed" | "status">,
  actor: TaskActor,
): boolean {
  if (!task.feedback_allowed) return false;
  if (["verified"].includes(task.status)) return false;
  if (actor.kind === "admin") return true;
  if (!actor.shopIds.includes(task.shop_id)) return false;
  if (task.assigned_staff_id && task.assigned_staff_id !== actor.staffId) {
    return actor.taskRole === "supervisor" || actor.taskRole === "manager";
  }
  return true;
}

export function canStartTask(
  task: Pick<RetailTaskRow, "shop_id" | "assigned_staff_id" | "status">,
  actor: TaskActor,
): boolean {
  if (actor.kind === "admin") return false;
  if (task.status !== "pending" && task.status !== "rejected") return false;
  return canSubmitTask(task, actor);
}

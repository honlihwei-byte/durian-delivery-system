import type { createAdminClient } from "@/lib/supabase/admin";
import {
  createTaskVerification,
  getLatestSubmission,
  setTaskStatus,
} from "@/lib/retail-tasks/retail-tasks-db";
import { notifyStaffTask } from "@/lib/retail-tasks/task-notifications";
import type { RetailTaskRow, TaskReviewDecision, TaskReviewSummary, TaskStatus } from "@/lib/retail-tasks/types";

export const TASK_REVIEW_SCORE: Record<TaskReviewDecision, number> = {
  accepted: 100,
  fair: 70,
  rejected: 0,
};

export const TASK_REVIEW_RELIABILITY_PENALTY: Record<TaskReviewDecision, number> = {
  accepted: 0,
  fair: 1,
  rejected: 5,
};

type Supabase = ReturnType<typeof createAdminClient>;

/** Parse API / legacy decision values. */
export function parseTaskReviewDecision(raw: unknown): TaskReviewDecision | null {
  if (raw === "accepted" || raw === "fair" || raw === "rejected") return raw;
  if (raw === "approved") return "accepted";
  return null;
}

export function normalizeStoredReviewDecision(raw: string): TaskReviewDecision {
  if (raw === "fair" || raw === "rejected") return raw;
  return "accepted";
}

export function taskStatusForReviewDecision(decision: TaskReviewDecision): TaskStatus {
  if (decision === "accepted") return "verified";
  if (decision === "fair") return "fair";
  return "rejected";
}

export function taskActionForReviewDecision(
  decision: TaskReviewDecision,
): "verified" | "rejected" | "status_changed" {
  if (decision === "accepted") return "verified";
  if (decision === "rejected") return "rejected";
  return "status_changed";
}

export function reviewSummaryFromRow(row: {
  decision: string;
  rejection_reason?: string | null;
  verified_at: string;
}): TaskReviewSummary {
  const decision = normalizeStoredReviewDecision(row.decision);
  return {
    decision,
    manager_feedback: row.rejection_reason?.trim() || null,
    awarded_score: TASK_REVIEW_SCORE[decision],
    verified_at: row.verified_at,
  };
}

export function computeAverageReviewScore(counts: {
  accepted: number;
  fair: number;
  rejected: number;
}): number | null {
  const total = counts.accepted + counts.fair + counts.rejected;
  if (total === 0) return null;
  const sum =
    counts.accepted * TASK_REVIEW_SCORE.accepted +
    counts.fair * TASK_REVIEW_SCORE.fair +
    counts.rejected * TASK_REVIEW_SCORE.rejected;
  return Math.round(sum / total);
}

export function reviewNotificationCopy(
  decision: TaskReviewDecision,
  taskTitle: string,
  managerFeedback: string | null,
): { notification_type: string; title: string; body: string; fire_key: string } {
  if (decision === "accepted") {
    return {
      notification_type: "task_verified",
      title: "Task accepted.",
      body: taskTitle,
      fire_key: "accepted",
    };
  }
  if (decision === "fair") {
    const body = managerFeedback
      ? `${taskTitle}: ${managerFeedback}`
      : "Task accepted with feedback.";
    return {
      notification_type: "task_verified",
      title: "Task accepted with feedback.",
      body,
      fire_key: "fair",
    };
  }
  const body = managerFeedback
    ? `Task rejected. Please review manager comments. ${managerFeedback}`
    : "Task rejected. Please review manager comments.";
  return {
    notification_type: "task_rejected",
    title: "Task rejected. Please review manager comments.",
    body,
    fire_key: "rejected",
  };
}

export async function applyTaskReview(
  supabase: Supabase,
  params: {
    task: RetailTaskRow;
    shopId: string;
    verifierId: string;
    verifierName: string;
    verifierRole: string;
    decision: TaskReviewDecision;
    manager_feedback?: string | null;
    notifyAssignee?: boolean;
  },
): Promise<RetailTaskRow> {
  const feedback = params.manager_feedback?.trim() || null;

  if (params.decision === "rejected" && !feedback) {
    throw new Error("manager_feedback is required when rejecting");
  }

  const submission = await getLatestSubmission(supabase, params.task.id);

  await createTaskVerification(supabase, {
    task_id: params.task.id,
    submission_id: submission?.id ?? null,
    verifier_id: params.verifierId,
    decision: params.decision,
    rejection_reason: feedback,
  });

  const newStatus = taskStatusForReviewDecision(params.decision);
  const action = taskActionForReviewDecision(params.decision);
  const note =
    feedback ??
    (params.decision === "accepted"
      ? "Accepted"
      : params.decision === "fair"
        ? "Fair / needs improvement"
        : "Rejected");

  const updated = await setTaskStatus(
    supabase,
    params.task.id,
    newStatus,
    { id: params.verifierId, name: params.verifierName, role: params.verifierRole },
    action,
    note,
  );

  if (params.notifyAssignee !== false && params.task.assigned_staff_id) {
    const copy = reviewNotificationCopy(params.decision, params.task.title, feedback);
    await notifyStaffTask(supabase, {
      company_id: params.task.company_id,
      staff_id: params.task.assigned_staff_id,
      shop_id: params.shopId,
      notification_type: copy.notification_type,
      title: copy.title,
      body: copy.body,
      task_id: params.task.id,
      fire_key: copy.fire_key,
    });
  }

  return updated;
}

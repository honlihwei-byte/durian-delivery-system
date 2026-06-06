import type { DayIssueStats } from "@/lib/attendance-report";
import { riskBadgesForRows } from "@/lib/attendance-risk-badges";
import type { AttendanceRecord } from "@/lib/attendance";

export type ShopHealthCounts = {
  late: number;
  missing_clock_out: number;
  gps_issues: number;
  review_required: number;
  overdue_tasks: number;
  task_exceptions: number;
};

export type HealthReasonKey =
  | "late_punch"
  | "missing_clock_out"
  | "gps_issue"
  | "review_required"
  | "overdue_task"
  | "task_exception";

export type HealthReason = { key: HealthReasonKey; count: number };

export type HealthStatusBand = "excellent" | "good" | "needs_attention" | "critical";

/** MVP shop health score — start at 100, subtract per issue (min 0). */
export function computeShopHealthScore(counts: ShopHealthCounts): number {
  let score = 100;
  score -= counts.late * 5;
  score -= counts.missing_clock_out * 8;
  score -= counts.gps_issues * 5;
  score -= counts.review_required * 5;
  score -= counts.overdue_tasks * 5;
  score -= counts.task_exceptions * 3;
  return Math.max(0, score);
}

export function buildHealthReasons(counts: ShopHealthCounts): HealthReason[] {
  const reasons: HealthReason[] = [];
  if (counts.late > 0) reasons.push({ key: "late_punch", count: counts.late });
  if (counts.missing_clock_out > 0) {
    reasons.push({ key: "missing_clock_out", count: counts.missing_clock_out });
  }
  if (counts.gps_issues > 0) reasons.push({ key: "gps_issue", count: counts.gps_issues });
  if (counts.review_required > 0) {
    reasons.push({ key: "review_required", count: counts.review_required });
  }
  if (counts.overdue_tasks > 0) reasons.push({ key: "overdue_task", count: counts.overdue_tasks });
  if (counts.task_exceptions > 0) {
    reasons.push({ key: "task_exception", count: counts.task_exceptions });
  }
  return reasons;
}

export function healthStatusFromScore(score: number): HealthStatusBand {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 60) return "needs_attention";
  return "critical";
}

export function computeStaffReliabilityMvp(counts: {
  late: number;
  missing_clock_out: number;
  gps_issues: number;
  rejected_task_proofs: number;
}): number {
  let score = 100;
  score -= counts.late * 5;
  score -= counts.missing_clock_out * 8;
  score -= counts.gps_issues * 5;
  score -= counts.rejected_task_proofs * 5;
  return Math.max(0, score);
}

export function staffNeedsReviewToday(issues: DayIssueStats, history: AttendanceRecord[]): boolean {
  const risk = riskBadgesForRows(history);
  return (
    issues.missing_clock_out ||
    issues.rejected_gps_count > 0 ||
    issues.review_required_count > 0 ||
    issues.photo_proof_count > 0 ||
    issues.badges.includes("suspicious_punch_sequence") ||
    risk.includes("high_risk") ||
    risk.includes("new_device") ||
    risk.includes("buddy_punch")
  );
}

export function gpsIssueCountFromIssues(issues: DayIssueStats): number {
  return issues.rejected_gps_count + issues.review_required_count + issues.weak_indoor_count;
}

import type { DayIssueStats } from "@/lib/attendance-report";
import { riskBadgesForRows } from "@/lib/attendance-risk-badges";
import type { AttendanceRecord } from "@/lib/attendance";

export type ShopHealthCounts = {
  late: number;
  missing_clock_out: number;
  gps_issues: number;
  review_required: number;
};

/** MVP shop health score per product spec. */
export function computeShopHealthScore(counts: ShopHealthCounts): number {
  let score = 100;
  score -= counts.late * 10;
  score -= counts.missing_clock_out * 15;
  score -= counts.gps_issues * 10;
  score -= counts.review_required * 10;
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

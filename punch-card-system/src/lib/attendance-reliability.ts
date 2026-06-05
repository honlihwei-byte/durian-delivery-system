import type { DayIssueStats } from "@/lib/attendance-report";

export type ReliabilityTier = "excellent" | "good" | "fair" | "poor";

export type AttendanceReliability = {
  score: number;
  tier: ReliabilityTier;
};

export type ReliabilityInputRow = {
  missing_clock_out_days?: number;
  rejected_gps_count?: number;
  review_required_count?: number;
  issues: DayIssueStats;
  shift_performance?: { late_count?: number } | null;
};

export function attendanceReliability(row: ReliabilityInputRow): AttendanceReliability {
  let score = 100;

  const miss = row.missing_clock_out_days ?? 0;
  if (miss > 0) score -= 2;
  if (miss > 1) score -= Math.min(28, (miss - 1) * 4);

  score -= Math.min(20, (row.rejected_gps_count ?? 0) * 5);
  score -= Math.min(8, (row.review_required_count ?? 0) * 1);

  if (row.issues.badges.includes("duplicate_punch")) score -= 2;
  if (row.issues.badges.includes("suspicious_punch_sequence")) score -= 12;
  if (row.issues.badges.includes("new_device")) score -= 10;
  if (row.issues.badges.includes("device_mismatch")) score -= 15;
  if (row.issues.badges.includes("buddy_punch")) score -= 15;
  if (row.issues.badges.includes("high_risk")) score -= 20;

  score -= Math.min(20, (row.shift_performance?.late_count ?? 0) * 2);

  score = Math.max(0, Math.min(100, Math.round(score)));
  const tier: ReliabilityTier =
    score >= 90 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "fair" : "poor";
  return { score, tier };
}

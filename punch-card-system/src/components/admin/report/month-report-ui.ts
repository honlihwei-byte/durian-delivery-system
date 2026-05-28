import {
  attendanceForTotals,
  computeValidPunchDay,
  dayShopStatusFromRows,
  formatDuration,
  sortByEventTime,
  type AttendanceRecord,
} from "@/lib/attendance";
import { matchesEventDate, recordEventTime } from "@/lib/attendance-db";
import type { DayIssueStats, IssueBadgeType } from "@/lib/attendance-report";
import { isManualApprovalMethod } from "@/lib/verification-method";
import { malaysiaDateYmd } from "@/lib/malaysia-time";

export type MonthStaffStatus = "in_shop" | "out" | "absent" | "review_needed";

export type MonthShiftPerformanceUi = {
  scheduled_days: number;
  present_days: number;
  late_count: number;
  absent_count: number;
  early_leave_count: number;
  actual_hours_ms: number;
  scheduled_hours_ms: number;
  actual_hours_label: string;
  scheduled_hours_label: string;
  reliability_percent: number;
  daily?: Array<{
    date: string;
    scheduled_start: string | null;
    scheduled_end: string | null;
    actual_clock_in: string | null;
    actual_clock_out: string | null;
    late_minutes: number;
    early_leave_minutes: number;
    status: string;
  }>;
};

export type MonthRowUi = {
  staff_id: string;
  staff_name: string;
  staff_code: string;
  staff_type: string;
  staff_status?: string;
  present_days: number;
  total_hours_ms: number;
  total_hours_label: string;
  missing_clock_out_days: number;
  weak_gps_count: number;
  rejected_gps_count: number;
  review_required_count: number;
  summary_score: number;
  issues: DayIssueStats;
  history: AttendanceRecord[];
  shift_performance?: MonthShiftPerformanceUi | null;
};

export type MonthDashboardSummary = {
  presentStaff: number;
  totalHoursLabel: string;
  inShopCount: number;
  missingPunchCount: number;
  reviewRequiredCount: number;
  lateIssuesCount: number;
};

export type RowAttention = "normal" | "attention" | "critical";

const GPS_ISSUE_BADGES: IssueBadgeType[] = [
  "weak_indoor",
  "expanded_radius",
  "rejected_gps",
  "review_required",
];

export function monthIncludesToday(monthYmd: string): boolean {
  const today = malaysiaDateYmd(new Date());
  return today.startsWith(`${monthYmd}-`);
}

export function staffMonthStatus(
  history: AttendanceRecord[],
  monthYmd: string,
): MonthStaffStatus {
  const today = malaysiaDateYmd(new Date());
  const todayRows = history.filter((r) => matchesEventDate(r, today));

  if (monthIncludesToday(monthYmd)) {
    const todayCounted = attendanceForTotals(todayRows);
    if (todayCounted.length === 0) {
      return attendanceForTotals(history).length > 0 ? "absent" : "absent";
    }
    const todayStatus = dayShopStatusFromRows(todayRows, today);
    if (todayStatus === "in_shop") return "in_shop";
    if (todayStatus === "missing_clock_out") return "review_needed";
    return "out";
  }

  const sorted = sortByEventTime(attendanceForTotals(history));
  if (sorted.length === 0) return "absent";
  const last = sorted[sorted.length - 1]!;
  if (last.action_type === "clock_in") return "review_needed";
  return "out";
}

export function rowAttention(row: MonthRowUi, monthYmd: string): RowAttention {
  if (
    row.missing_clock_out_days > 0 ||
    row.issues.badges.includes("missing_punch") ||
    row.issues.badges.includes("missing_clock_in") ||
    row.rejected_gps_count > 0
  ) {
    return "critical";
  }
  if (
    row.review_required_count > 0 ||
    row.weak_gps_count > 0 ||
    row.issues.missing_clock_out ||
    staffMonthStatus(row.history, monthYmd) === "review_needed"
  ) {
    return "attention";
  }
  return "normal";
}

export function buildMonthDashboardSummary(
  monthYmd: string,
  rows: MonthRowUi[],
  summaryTotalHoursLabel: string,
): MonthDashboardSummary {
  let inShopCount = 0;
  let missingPunchCount = 0;
  let reviewRequiredCount = 0;
  let lateIssuesCount = 0;

  for (const row of rows) {
    if (staffMonthStatus(row.history, monthYmd) === "in_shop") inShopCount += 1;
    if (
      row.missing_clock_out_days > 0 ||
      row.issues.badges.includes("missing_punch") ||
      row.issues.badges.includes("missing_clock_in") ||
      row.issues.badges.includes("missing_clock_out")
    ) {
      missingPunchCount += 1;
    }
    if (row.review_required_count > 0 || row.issues.badges.includes("review_required")) {
      reviewRequiredCount += 1;
    }
    if (row.missing_clock_out_days > 0) lateIssuesCount += row.missing_clock_out_days;
  }

  return {
    presentStaff: rows.length,
    totalHoursLabel: summaryTotalHoursLabel,
    inShopCount,
    missingPunchCount,
    reviewRequiredCount,
    lateIssuesCount,
  };
}

export function averageHoursPerDayLabel(row: MonthRowUi): string {
  if (row.present_days <= 0) return "—";
  return formatDuration(Math.floor(row.total_hours_ms / row.present_days));
}

export type ManagerIssueChip = {
  key: string;
  label: string;
  tone: "amber" | "violet" | "teal" | "orange" | "red" | "rose" | "sky";
};

export function managerIssueChips(issues: DayIssueStats, row: MonthRowUi): ManagerIssueChip[] {
  const chips: ManagerIssueChip[] = [];
  const seen = new Set<string>();

  const add = (key: string, label: string, tone: ManagerIssueChip["tone"]) => {
    if (seen.has(key)) return;
    seen.add(key);
    chips.push({ key, label, tone });
  };

  if (issues.badges.includes("missing_clock_out") || row.missing_clock_out_days > 0) {
    add("missing_out", "Missing Clock Out", "amber");
  }
  if (issues.badges.includes("missing_clock_in")) add("missing_in", "Missing Clock In", "amber");
  if (issues.badges.includes("photo_proof") || issues.photo_proof_count > 0) {
    add("photo_proof", "Photo Proof", "violet");
  }
  if (issues.manual_approved_count > 0 || issues.badges.includes("manual_approved")) {
    add("manual", "Manual Approved", "teal");
  }
  if (
    row.weak_gps_count > 0 ||
    row.rejected_gps_count > 0 ||
    row.review_required_count > 0 ||
    issues.badges.some((b) => GPS_ISSUE_BADGES.includes(b))
  ) {
    add("gps", "GPS Issues", "orange");
  }
  if (issues.badges.includes("duplicate_punch")) add("dup", "Duplicate Punch", "rose");
  if (issues.badges.includes("suspicious_punch_sequence")) {
    add("suspicious", "Suspicious Sequence", "orange");
  }
  if (issues.badges.includes("duplicate_prevented")) {
    add("dup_prev", "Duplicate Prevented", "sky");
  }

  return chips;
}

export type AttendanceReliability = {
  score: number; // 0-100
  label: "Excellent" | "Good" | "Needs Attention" | "High Risk";
};

export function attendanceReliability(row: MonthRowUi): AttendanceReliability {
  // Start from 100 and subtract only for suspicious / problematic behavior.
  // Do NOT punish trusted device, verified GPS, or normal indoor fallback.
  let score = 100;

  // Missing punch (clock-in/out problems)
  score -= Math.min(60, (row.missing_clock_out_days ?? 0) * 10);

  // Location / proof / review signals
  score -= Math.min(20, (row.rejected_gps_count ?? 0) * 5);
  score -= Math.min(15, (row.review_required_count ?? 0) * 3);

  // Punch sequence / duplicates
  if (row.issues.badges.includes("duplicate_punch")) score -= 10;
  if (row.issues.badges.includes("suspicious_punch_sequence")) score -= 10;

  // Risk badges (exclude trusted_device by design)
  if (row.issues.badges.includes("new_device")) score -= 8;
  if (row.issues.badges.includes("buddy_punch")) score -= 15;
  if (row.issues.badges.includes("high_risk")) score -= 20;

  // Shift-related lateness frequency (if available)
  score -= Math.min(20, (row.shift_performance?.late_count ?? 0) * 2);

  score = Math.max(0, Math.min(100, Math.round(score)));
  const label =
    score >= 90 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Needs Attention" : "High Risk";
  return { score, label };
}

export type MonthDaySession = {
  date: string;
  sessions: { in: string; out: string; durationLabel: string }[];
  firstIn: string | null;
  lastOut: string | null;
  hoursLabel: string;
};

export function monthWorkingSessionsByDay(
  history: AttendanceRecord[],
  monthYmd: string,
  daysInMonth: number,
): MonthDaySession[] {
  const days: MonthDaySession[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dd = String(day).padStart(2, "0");
    const ymd = `${monthYmd}-${dd}`;
    const dayRows = history.filter((p) => matchesEventDate(p, ymd));
    if (attendanceForTotals(dayRows).length === 0) continue;
    const { sessions, firstValidIn, lastValidOut, totalMs } = computeValidPunchDay(dayRows);
    days.push({
      date: ymd,
      sessions: sessions.map((s) => ({
        in: recordEventTime(s.in),
        out: recordEventTime(s.out),
        durationLabel: formatDuration(s.durationMs),
      })),
      firstIn: firstValidIn ? recordEventTime(firstValidIn) : null,
      lastOut: lastValidOut ? recordEventTime(lastValidOut) : null,
      hoursLabel: formatDuration(totalMs),
    });
  }
  return days;
}

export function monthFirstInLastOut(history: AttendanceRecord[]): {
  firstIn: string | null;
  lastOut: string | null;
} {
  const sorted = sortByEventTime(attendanceForTotals(history));
  const ins = sorted.filter((r) => r.action_type === "clock_in");
  const outs = sorted.filter((r) => r.action_type === "clock_out");
  return {
    firstIn: ins[0] ? recordEventTime(ins[0]) : null,
    lastOut: outs.length ? recordEventTime(outs[outs.length - 1]!) : null,
  };
}

export function monthManualEdits(history: AttendanceRecord[]): AttendanceRecord[] {
  return sortByEventTime(history).filter(
    (r) =>
      isManualApprovalMethod(r.verification_method) ||
      Boolean(r.audit_notes?.trim()),
  );
}

export function monthPhotoProofRows(history: AttendanceRecord[]): AttendanceRecord[] {
  return sortByEventTime(history).filter((r) => r.photo_proof_used);
}

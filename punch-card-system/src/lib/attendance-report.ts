import {
  attendanceForTotals,
  firstClockIn,
  formatDuration,
  gpsStatusLabel,
  lastClockOut,
  punchIssueForDay,
  sortByCreatedAt,
  totalWorkedMsForDay,
  type AttendanceRecord,
  type GpsStatusLabel,
} from "@/lib/attendance";
import { matchesEventDate, recordEventTime } from "@/lib/attendance-db";

export type IssueBadgeType =
  | "missing_clock_out"
  | "weak_indoor"
  | "review_required"
  | "rejected_gps";

export const ISSUE_BADGE_LABELS: Record<IssueBadgeType, string> = {
  missing_clock_out: "Missing clock out",
  weak_indoor: "Weak indoor GPS",
  review_required: "Review required",
  rejected_gps: "Rejected GPS",
};

export type DayIssueStats = {
  badges: IssueBadgeType[];
  issue_count: number;
  missing_clock_out: boolean;
  weak_indoor_count: number;
  review_required_count: number;
  rejected_gps_count: number;
};

export type DayCellDetail = {
  present: boolean;
  hours_ms: number;
  hours_label: string;
  first_in: string | null;
  last_out: string | null;
  issues: DayIssueStats;
  punch_issue: string | null;
  history: AttendanceRecord[];
};

export type ReportSummary = {
  total_present_staff: number;
  total_hours_ms: number;
  total_hours_label: string;
  missing_clock_out_count: number;
  weak_indoor_count: number;
  rejected_gps_count: number;
  review_required_count: number;
  gps_issues_count: number;
};

export type GpsStatusFilter =
  | ""
  | "verified"
  | "weak_indoor"
  | "review_required"
  | "rejected"
  | "location_na";

export type IssueTypeFilter =
  | ""
  | "missing_clock_out"
  | "weak_indoor"
  | "review_required"
  | "rejected_gps"
  | "any"
  | "none";

export function parseGpsStatusFilter(v: string | null): GpsStatusFilter {
  const allowed: GpsStatusFilter[] = [
    "",
    "verified",
    "weak_indoor",
    "review_required",
    "rejected",
    "location_na",
  ];
  return allowed.includes(v as GpsStatusFilter) ? (v as GpsStatusFilter) : "";
}

export function parseIssueTypeFilter(v: string | null): IssueTypeFilter {
  const allowed: IssueTypeFilter[] = [
    "",
    "missing_clock_out",
    "weak_indoor",
    "review_required",
    "rejected_gps",
    "any",
    "none",
  ];
  return allowed.includes(v as IssueTypeFilter) ? (v as IssueTypeFilter) : "";
}

function gpsStatusToFilterKey(status: GpsStatusLabel): GpsStatusFilter {
  switch (status) {
    case "Verified":
      return "verified";
    case "Weak Indoor":
      return "weak_indoor";
    case "Review Required":
      return "review_required";
    case "Rejected":
      return "rejected";
    default:
      return "location_na";
  }
}

export function analyzeDayIssues(rows: AttendanceRecord[]): DayIssueStats {
  const badges: IssueBadgeType[] = [];
  let weak_indoor_count = 0;
  let review_required_count = 0;
  let rejected_gps_count = 0;

  for (const r of rows) {
    const status = gpsStatusLabel(r);
    if (status === "Weak Indoor") weak_indoor_count += 1;
    if (status === "Review Required") review_required_count += 1;
    if (status === "Rejected") rejected_gps_count += 1;
  }

  const missing_clock_out = punchIssueForDay(rows) === "Missing clock out";
  if (missing_clock_out) badges.push("missing_clock_out");
  if (weak_indoor_count > 0) badges.push("weak_indoor");
  if (review_required_count > 0) badges.push("review_required");
  if (rejected_gps_count > 0) badges.push("rejected_gps");

  return {
    badges,
    issue_count: badges.length,
    missing_clock_out,
    weak_indoor_count,
    review_required_count,
    rejected_gps_count,
  };
}

export function dayCellDetail(rows: AttendanceRecord[], dayYmd: string): DayCellDetail {
  const dayRows = rows.filter((p) => matchesEventDate(p, dayYmd));
  const present = attendanceForTotals(dayRows).length > 0;
  const hours_ms = totalWorkedMsForDay(dayRows);
  const fi = firstClockIn(dayRows);
  const lo = lastClockOut(dayRows);
  const issues = analyzeDayIssues(dayRows);

  return {
    present,
    hours_ms,
    hours_label: formatDuration(hours_ms),
    first_in: fi ? recordEventTime(fi) : null,
    last_out: lo ? recordEventTime(lo) : null,
    issues,
    punch_issue: punchIssueForDay(dayRows),
    history: sortByCreatedAt(dayRows),
  };
}

export function monthStatsFromRows(rows: AttendanceRecord[], daysInMonth: number, monthYmdPrefix: string) {
  let missing_clock_out_days = 0;
  let weak_gps_count = 0;
  let review_required_count = 0;
  let rejected_gps_count = 0;
  let total_hours_ms = 0;
  const presentDates = new Set<string>();

  for (let day = 1; day <= daysInMonth; day++) {
    const dd = String(day).padStart(2, "0");
    const ymd = `${monthYmdPrefix}-${dd}`;
    const dayRows = rows.filter((p) => matchesEventDate(p, ymd));
    if (attendanceForTotals(dayRows).length === 0) continue;
    presentDates.add(ymd);
    total_hours_ms += totalWorkedMsForDay(dayRows);
    const issues = analyzeDayIssues(dayRows);
    if (issues.missing_clock_out) missing_clock_out_days += 1;
    weak_gps_count += issues.weak_indoor_count;
    review_required_count += issues.review_required_count;
    rejected_gps_count += issues.rejected_gps_count;
  }

  const present_days = presentDates.size;
  const summary_score = staffAttendanceScore({
    present_days,
    missing_clock_out_days,
    weak_gps_count,
    review_required_count,
    rejected_gps_count,
  });

  return {
    present_days,
    no_punch_days: Math.max(0, daysInMonth - present_days),
    total_hours_ms,
    total_hours_label: formatDuration(total_hours_ms),
    missing_clock_out_days,
    weak_gps_count,
    review_required_count,
    rejected_gps_count,
    summary_score,
  };
}

export function staffAttendanceScore(stats: {
  present_days: number;
  missing_clock_out_days: number;
  weak_gps_count: number;
  review_required_count: number;
  rejected_gps_count: number;
}): number {
  if (stats.present_days === 0) return 0;
  let score = 100;
  score -= stats.missing_clock_out_days * 8;
  score -= stats.weak_gps_count * 2;
  score -= stats.review_required_count * 3;
  score -= stats.rejected_gps_count * 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  return "Needs review";
}

export function historyMatchesGpsFilter(
  history: AttendanceRecord[],
  filter: GpsStatusFilter,
): boolean {
  if (!filter) return true;
  return history.some((h) => gpsStatusToFilterKey(gpsStatusLabel(h)) === filter);
}

export function rowMatchesIssueFilter(issues: DayIssueStats, filter: IssueTypeFilter): boolean {
  if (!filter) return true;
  if (filter === "any") return issues.issue_count > 0;
  if (filter === "none") return issues.issue_count === 0;
  return issues.badges.includes(filter);
}

export function aggregateIssuesFromHistories(histories: AttendanceRecord[][]): DayIssueStats {
  const merged: IssueBadgeType[] = [];
  let weak = 0;
  let review = 0;
  let rejected = 0;
  let missing = false;

  for (const rows of histories) {
    const d = analyzeDayIssues(rows);
    missing = missing || d.missing_clock_out;
    weak += d.weak_indoor_count;
    review += d.review_required_count;
    rejected += d.rejected_gps_count;
    for (const b of d.badges) {
      if (!merged.includes(b)) merged.push(b);
    }
  }

  return {
    badges: merged,
    issue_count: merged.length,
    missing_clock_out: missing,
    weak_indoor_count: weak,
    review_required_count: review,
    rejected_gps_count: rejected,
  };
}

export function buildReportSummary(
  rows: { total_hours_ms: number; issues?: DayIssueStats; history?: AttendanceRecord[] }[],
): ReportSummary {
  let total_hours_ms = 0;
  let missing_clock_out_count = 0;
  let weak_indoor_count = 0;
  let rejected_gps_count = 0;
  let review_required_count = 0;

  for (const row of rows) {
    total_hours_ms += row.total_hours_ms ?? 0;
    const issues =
      row.issues ??
      (row.history ? analyzeDayIssues(row.history) : null);
    if (!issues) continue;
    if (issues.missing_clock_out) missing_clock_out_count += 1;
    weak_indoor_count += issues.weak_indoor_count;
    review_required_count += issues.review_required_count;
    rejected_gps_count += issues.rejected_gps_count;
  }

  return {
    total_present_staff: rows.length,
    total_hours_ms,
    total_hours_label: formatDuration(total_hours_ms),
    missing_clock_out_count,
    weak_indoor_count,
    rejected_gps_count,
    review_required_count,
    gps_issues_count: weak_indoor_count + rejected_gps_count + review_required_count,
  };
}

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

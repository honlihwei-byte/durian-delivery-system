import type { AttendanceRecord } from "@/lib/attendance";
import { gpsStatusLabel } from "@/lib/attendance";
import { recordEventDate, recordEventTime } from "@/lib/attendance-db";
import type { DayCellDetail, ReportSummary } from "@/lib/attendance-report";
import { downloadCsv, ISSUE_BADGE_LABELS, scoreLabel, type IssueBadgeType } from "@/lib/attendance-report";

function issuesText(badges: IssueBadgeType[]): string {
  return badges.map((b) => ISSUE_BADGE_LABELS[b]).join("; ");
}

type DayRow = {
  staff_name: string;
  staff_code: string;
  staff_type: string;
  shops_label: string;
  first_in: string | null;
  last_out: string | null;
  total_hours_label: string;
  issues: { badges: IssueBadgeType[] };
};

type WeekRow = {
  staff_name: string;
  staff_code: string;
  staff_type: string;
  daily: Record<string, DayCellDetail>;
  total_present_days: number;
  total_hours_label: string;
  history?: AttendanceRecord[];
};

type MonthRow = {
  staff_name: string;
  staff_code: string;
  staff_type: string;
  present_days: number;
  total_hours_label: string;
  missing_clock_out_days: number;
  weak_gps_count: number;
  rejected_gps_count: number;
  review_required_count: number;
  summary_score: number;
};

export function exportDayCsv(date: string, rows: DayRow[]) {
  downloadCsv(`attendance-day-${date}.csv`, [
    "Staff",
    "Code",
    "Type",
    "Shops",
    "First in",
    "Last out",
    "Hours",
    "Issues",
  ], rows.map((r) => [
    r.staff_name,
    r.staff_code,
    r.staff_type,
    r.shops_label,
    r.first_in,
    r.last_out,
    r.total_hours_label,
    issuesText(r.issues.badges),
  ]));
}

export function exportWeekCsv(weekStart: string, days: string[], rows: WeekRow[]) {
  const headers = ["Staff", "Code", "Type", ...days.map((d) => d), "Present days", "Total hours"];
  const body = rows.map((r) => [
    r.staff_name,
    r.staff_code,
    r.staff_type,
    ...days.map((d) => {
      const c = r.daily[d];
      if (!c?.present) return "";
      const issues = c.issues.issue_count > 0 ? ` (${c.issues.issue_count} issues)` : "";
      return `${c.hours_label}${issues}`;
    }),
    r.total_present_days,
    r.total_hours_label,
  ]);
  downloadCsv(`attendance-week-${weekStart}.csv`, headers, body);
}

export function exportMonthCsv(month: string, rows: MonthRow[]) {
  downloadCsv(`attendance-month-${month}.csv`, [
    "Staff",
    "Code",
    "Type",
    "Present days",
    "Total hours",
    "Missing clock out days",
    "Weak GPS",
    "Rejected GPS",
    "Review required",
    "Score",
    "Score label",
  ], rows.map((r) => [
    r.staff_name,
    r.staff_code,
    r.staff_type,
    r.present_days,
    r.total_hours_label,
    r.missing_clock_out_days,
    r.weak_gps_count,
    r.rejected_gps_count,
    r.review_required_count,
    r.summary_score,
    scoreLabel(r.summary_score),
  ]));
}

export function exportPunchLogCsv(
  label: string,
  rows: { staff_name: string; staff_code: string; history: AttendanceRecord[] }[],
) {
  const headers = ["Staff", "Code", "Date", "Time", "Shop", "Action", "GPS status", "Distance m"];
  const body: (string | number | null)[][] = [];
  for (const r of rows) {
    for (const h of r.history) {
      body.push([
        r.staff_name,
        r.staff_code,
        recordEventDate(h),
        recordEventTime(h),
        h.shop_name,
        h.action_type,
        gpsStatusLabel(h),
        h.distance_from_shop_meters ?? "",
      ]);
    }
  }
  downloadCsv(`attendance-punches-${label}.csv`, headers, body);
}

export function exportSummaryCsv(mode: string, summary: ReportSummary) {
  downloadCsv(`attendance-summary-${mode}.csv`, ["Metric", "Value"], [
    ["Present staff", summary.total_present_staff],
    ["Total hours", summary.total_hours_label],
    ["Missing clock out", summary.missing_clock_out_count],
    ["Weak indoor GPS", summary.weak_indoor_count],
    ["Rejected GPS", summary.rejected_gps_count],
    ["Review required", summary.review_required_count],
    ["GPS issues total", summary.gps_issues_count],
  ]);
}

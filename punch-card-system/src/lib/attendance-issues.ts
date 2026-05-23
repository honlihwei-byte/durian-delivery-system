import {
  attendanceForTotals,
  sortByCreatedAt,
  type AttendanceRecord,
} from "@/lib/attendance";
import { malaysiaDateYmd } from "@/lib/malaysia-time";

export type DayAttendanceIssue = "missing_clock_in" | "missing_clock_out";

export type DayAttendanceIssueResult = {
  missing_clock_in: boolean;
  missing_clock_out: boolean;
  missing_punch: boolean;
  issues: DayAttendanceIssue[];
  issue_labels: string[];
};

export function detectDayAttendanceIssues(
  rows: AttendanceRecord[],
  dayYmd?: string,
): DayAttendanceIssueResult {
  const counted = attendanceForTotals(rows);
  const issues: DayAttendanceIssue[] = [];

  if (counted.length === 0) {
    return {
      missing_clock_in: false,
      missing_clock_out: false,
      missing_punch: false,
      issues: [],
      issue_labels: [],
    };
  }

  const sorted = sortByCreatedAt(counted);
  const hasIn = sorted.some((r) => r.action_type === "clock_in");
  const hasOut = sorted.some((r) => r.action_type === "clock_out");
  const last = sorted[sorted.length - 1]!;

  const missing_clock_in = hasOut && !hasIn;
  const missing_clock_out = hasIn && last.action_type === "clock_in";

  if (missing_clock_in) issues.push("missing_clock_in");
  if (missing_clock_out) issues.push("missing_clock_out");

  const issue_labels: string[] = [];
  if (missing_clock_in) issue_labels.push("Missing Clock In");
  if (missing_clock_out) issue_labels.push("Missing Clock Out");

  return {
    missing_clock_in,
    missing_clock_out,
    missing_punch: issues.length > 0,
    issues,
    issue_labels,
  };
}

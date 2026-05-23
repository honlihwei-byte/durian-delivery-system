import {
  attendanceForTotals,
  sortByEventTime,
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

  const sorted = sortByEventTime(counted);
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

export type PunchSequenceIssueResult = {
  duplicate_punch: boolean;
  suspicious_punch_sequence: boolean;
  consecutive_in_without_out: boolean;
  consecutive_out_without_in: boolean;
  multiple_in_out_same_day: boolean;
};

/** Detect duplicate / suspicious punch patterns (raw log unchanged). */
export function detectPunchSequenceIssues(rows: AttendanceRecord[]): PunchSequenceIssueResult {
  const sorted = sortByEventTime(attendanceForTotals(rows));
  let consecutive_in_without_out = false;
  let consecutive_out_without_in = false;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    if (prev.action_type === "clock_in" && cur.action_type === "clock_in") {
      consecutive_in_without_out = true;
    }
    if (prev.action_type === "clock_out" && cur.action_type === "clock_out") {
      consecutive_out_without_in = true;
    }
  }

  const inCount = sorted.filter((r) => r.action_type === "clock_in").length;
  const outCount = sorted.filter((r) => r.action_type === "clock_out").length;
  const multiple_in_out_same_day = inCount > 1 && outCount > 1;
  const duplicate_punch = consecutive_in_without_out || consecutive_out_without_in;
  const startsWithOut = sorted.length > 0 && sorted[0]!.action_type === "clock_out";
  const unbalanced = Math.abs(inCount - outCount) > 1;

  const suspicious_punch_sequence =
    duplicate_punch ||
    startsWithOut ||
    unbalanced ||
    (multiple_in_out_same_day && duplicate_punch);

  return {
    duplicate_punch,
    suspicious_punch_sequence,
    consecutive_in_without_out,
    consecutive_out_without_in,
    multiple_in_out_same_day,
  };
}

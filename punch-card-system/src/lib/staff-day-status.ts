import { detectDayAttendanceIssues } from "@/lib/attendance-issues";
import {
  attendanceForTotals,
  firstClockIn,
  formatDuration,
  gpsStatusLabel,
  lastClockOut,
  sortByEventTime,
  totalWorkedMsForDay,
  type AttendanceRecord,
} from "@/lib/attendance";
import {
  lastClockInRecord,
  smartPunchExpectedAction,
  smartPunchSessionState,
} from "@/lib/smart-punch";
import { recordEventTime } from "@/lib/attendance-db";
import { formatMalaysiaRecordedAt, malaysiaDateYmd, malaysiaTimeHms } from "@/lib/malaysia-time";

export type StaffTodayStatusKey =
  | "not_clocked_in"
  | "in_shop"
  | "out"
  | "missing_clock_out";

export const STAFF_TODAY_STATUS_LABELS: Record<StaffTodayStatusKey, string> = {
  not_clocked_in: "Not clocked in",
  in_shop: "In Shop",
  out: "Out",
  missing_clock_out: "Missing Clock Out",
};

/** Minimal rows for smart-punch validation on the clock page. */
export type StaffTodayPunchValidationRow = Pick<
  AttendanceRecord,
  "id" | "action_type" | "created_at" | "event_time" | "shop_name" | "audit_notes"
> & {
  photo_proof_used?: boolean | null;
  staff_latitude?: number | null;
  staff_longitude?: number | null;
  gps_verified?: boolean | null;
  verification_method?: string | null;
};

export type StaffTodayPunchLogEntry = {
  id: string;
  time_label: string;
  action_type: "clock_in" | "clock_out";
  action_short: "In" | "Out";
  gps_status: string;
  created_at: string;
};

export type StaffTodayStatusSummary = {
  day_ymd: string;
  status: StaffTodayStatusKey;
  status_label: string;
  first_in: string | null;
  last_out: string | null;
  total_hours_label: string;
  latest_action: "clock_in" | "clock_out" | null;
  latest_action_label: string | null;
  latest_time: string | null;
  latest_gps_status: string | null;
  suggest_clock_in: boolean;
  suggest_clock_out: boolean;
  active_session: boolean;
  smart_punch_action: "clock_in" | "clock_out";
  last_clock_in_time: string | null;
  last_clock_in_shop: string | null;
  history: StaffTodayPunchLogEntry[];
  punch_validation_rows: StaffTodayPunchValidationRow[];
  attendance_issues: {
    missing_clock_in: boolean;
    missing_clock_out: boolean;
    missing_punch: boolean;
    issue_labels: string[];
  };
};

export function staffTodayStatusKey(rows: AttendanceRecord[]): StaffTodayStatusKey {
  const counted = attendanceForTotals(rows);
  if (counted.length === 0) return "not_clocked_in";

  const issues = detectDayAttendanceIssues(rows);
  if (issues.missing_clock_out) return "missing_clock_out";

  const sorted = sortByEventTime(counted);
  const last = sorted[sorted.length - 1]!;

  if (last.action_type === "clock_out") return "out";
  if (last.action_type === "clock_in") return "in_shop";
  return "not_clocked_in";
}

export function buildStaffTodayStatusSummary(
  rows: AttendanceRecord[],
  dayYmd: string,
): StaffTodayStatusSummary {
  const counted = attendanceForTotals(rows);
  const status = staffTodayStatusKey(rows);
  const fi = firstClockIn(rows);
  const lo = lastClockOut(rows);
  const sorted = sortByEventTime(counted);
  const last = sorted.length > 0 ? sorted[sorted.length - 1]! : null;

  const history: StaffTodayPunchLogEntry[] = sorted.map((r) => {
    const timeLabel = recordEventTime(r).slice(0, 5);
    return {
      id: r.id,
      time_label: timeLabel,
      action_type: r.action_type,
      action_short: r.action_type === "clock_in" ? "In" : "Out",
      gps_status: gpsStatusLabel(r),
      created_at: r.created_at,
    };
  });

  const session = smartPunchSessionState(rows);
  const active_session = session === "active";
  const smart_punch_action = smartPunchExpectedAction(session);
  const lastIn = lastClockInRecord(rows);
  const suggest_clock_in = smart_punch_action === "clock_in";
  const suggest_clock_out = smart_punch_action === "clock_out";
  const attendance_issues = detectDayAttendanceIssues(rows);

  return {
    day_ymd: dayYmd,
    status,
    status_label: STAFF_TODAY_STATUS_LABELS[status],
    first_in: fi ? recordEventTime(fi) : null,
    last_out: lo ? recordEventTime(lo) : null,
    total_hours_label: formatDuration(totalWorkedMsForDay(rows)),
    latest_action: last?.action_type ?? null,
    latest_action_label: last
      ? last.action_type === "clock_in"
        ? "Clock In"
        : "Clock Out"
      : null,
    latest_time: last ? recordEventTime(last) : null,
    latest_gps_status: last ? gpsStatusLabel(last) : null,
    suggest_clock_in,
    suggest_clock_out,
    active_session,
    smart_punch_action,
    last_clock_in_time: lastIn ? recordEventTime(lastIn) : null,
    last_clock_in_shop: lastIn?.shop_name?.trim() || null,
    history,
    punch_validation_rows: rows.map((r) => ({
      id: r.id,
      action_type: r.action_type,
      created_at: r.created_at,
      event_time: r.event_time,
      shop_name: r.shop_name,
      audit_notes: r.audit_notes,
      photo_proof_used: r.photo_proof_used,
      staff_latitude: r.staff_latitude,
      staff_longitude: r.staff_longitude,
      gps_verified: r.gps_verified,
      verification_method: r.verification_method,
    })),
    attendance_issues: {
      missing_clock_in: attendance_issues.missing_clock_in,
      missing_clock_out: attendance_issues.missing_clock_out,
      missing_punch: attendance_issues.missing_punch,
      issue_labels: attendance_issues.issue_labels,
    },
  };
}

/** Block repeating the same action within `windowMs` of the latest punch. */
export function duplicateActionBlocked(
  rows: AttendanceRecord[],
  actionType: "clock_in" | "clock_out",
  windowMs: number,
): { blocked: boolean; message: string | null } {
  const counted = attendanceForTotals(rows);
  if (counted.length === 0) return { blocked: false, message: null };
  const sorted = sortByEventTime(counted);
  const last = sorted[sorted.length - 1]!;
  return duplicateActionBlockedFromLast(
    last.action_type,
    last.created_at,
    actionType,
    windowMs,
    recordEventTime(last),
  );
}

export function duplicateActionBlockedFromHistory(
  history: StaffTodayPunchLogEntry[],
  actionType: "clock_in" | "clock_out",
  windowMs: number,
): { blocked: boolean; message: string | null } {
  if (history.length === 0) return { blocked: false, message: null };
  const last = history[history.length - 1]!;
  return duplicateActionBlockedFromLast(
    last.action_type,
    last.created_at,
    actionType,
    windowMs,
    formatMalaysiaRecordedAt(last.created_at),
  );
}

function duplicateActionBlockedFromLast(
  lastAction: "clock_in" | "clock_out",
  lastCreatedAt: string,
  actionType: "clock_in" | "clock_out",
  windowMs: number,
  lastTimeLabel: string,
): { blocked: boolean; message: string | null } {
  if (lastAction !== actionType) return { blocked: false, message: null };
  const elapsed = Date.now() - new Date(lastCreatedAt).getTime();
  if (elapsed >= windowMs) return { blocked: false, message: null };
  const waitSec = Math.ceil((windowMs - elapsed) / 1000);
  const label = actionType === "clock_in" ? "Clock In" : "Clock Out";
  return {
    blocked: true,
    message: `${label} was already saved at ${lastTimeLabel.slice(0, 8)}. Wait ${waitSec}s before punching again.`,
  };
}

export function formatPunchSuccessToast(
  actionType: "clock_in" | "clock_out",
  at: Date = new Date(),
): string {
  const label = actionType === "clock_in" ? "Clock In" : "Clock Out";
  return `${label} saved at ${malaysiaTimeHms(at)}`;
}

import {
  attendanceForTotals,
  firstClockIn,
  formatDuration,
  gpsStatusLabel,
  lastClockOut,
  sortByCreatedAt,
  totalWorkedMsForDay,
  type AttendanceRecord,
} from "@/lib/attendance";
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
  history: StaffTodayPunchLogEntry[];
};

export function staffTodayStatusKey(rows: AttendanceRecord[]): StaffTodayStatusKey {
  const counted = attendanceForTotals(rows);
  if (counted.length === 0) return "not_clocked_in";

  const sorted = sortByCreatedAt(counted);
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
  const sorted = sortByCreatedAt(counted);
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

  const suggest_clock_in = status === "not_clocked_in" || status === "out";
  const suggest_clock_out = status === "in_shop";

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
    history,
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
  const sorted = sortByCreatedAt(counted);
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

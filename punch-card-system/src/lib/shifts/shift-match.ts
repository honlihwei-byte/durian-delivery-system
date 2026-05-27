import {
  attendanceForTotals,
  computeValidPunchDay,
  firstClockIn,
  lastClockOut,
  sortByEventTime,
  type AttendanceRecord,
} from "@/lib/attendance";
import { matchesEventDate, recordEventInstant, recordEventTime } from "@/lib/attendance-db";

export type ShiftMatchStatus =
  | "on_time"
  | "late"
  | "early_leave"
  | "absent"
  | "missing_clock_in"
  | "missing_clock_out"
  | "overtime"
  | "unscheduled_punch"
  | "off_day";

export type ShiftMatchResult = {
  date: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_clock_in: string | null;
  actual_clock_out: string | null;
  late_minutes: number;
  early_leave_minutes: number;
  overtime_minutes: number;
  missing_clock_in: boolean;
  missing_clock_out: boolean;
  absent: boolean;
  scheduled_hours_ms: number;
  worked_hours_ms: number;
  status: ShiftMatchStatus;
};

function hhmm(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.length >= 5 ? s.slice(0, 5) : null;
}

function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map((x) => Number(x));
  const [eh, em] = end.split(":").map((x) => Number(x));
  if (![sh, sm, eh, em].every(Number.isFinite)) return 0;
  let s = sh * 60 + sm;
  let e = eh * 60 + em;
  if (e <= s) e += 24 * 60;
  return Math.max(0, e - s);
}

export function matchAttendanceToScheduledShift(params: {
  ymd: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  breakMinutes?: number | null;
  isOffDay?: boolean;
  history: AttendanceRecord[];
}): ShiftMatchResult {
  const scheduledStart = hhmm(params.scheduledStart);
  const scheduledEnd = hhmm(params.scheduledEnd);
  const breakMin = Math.max(0, Math.round(Number(params.breakMinutes ?? 0) || 0));
  const isOffDay = params.isOffDay === true;

  const dayRows = sortByEventTime(
    attendanceForTotals(params.history.filter((r) => matchesEventDate(r, params.ymd))),
  );
  const valid = computeValidPunchDay(dayRows);
  const workedMs = valid.totalMs;

  const fi = firstClockIn(dayRows);
  const lo = lastClockOut(dayRows);

  const actualIn = fi ? recordEventTime(fi) : null;
  const actualOut = lo ? recordEventTime(lo) : null;
  const inMs = fi ? recordEventInstant(fi) : null;
  const outMs = lo ? recordEventInstant(lo) : null;

  const hasPunches = dayRows.length > 0;
  const hasSchedule = Boolean(scheduledStart && scheduledEnd);

  if (isOffDay) {
    return {
      date: params.ymd,
      scheduled_start: null,
      scheduled_end: null,
      actual_clock_in: actualIn,
      actual_clock_out: actualOut,
      late_minutes: 0,
      early_leave_minutes: 0,
      overtime_minutes: 0,
      missing_clock_in: fi == null && hasPunches,
      missing_clock_out: fi != null && lo == null,
      absent: false,
      scheduled_hours_ms: 0,
      worked_hours_ms: workedMs,
      status: hasPunches ? "unscheduled_punch" : "off_day",
    };
  }

  if (!hasSchedule && hasPunches) {
    return {
      date: params.ymd,
      scheduled_start: null,
      scheduled_end: null,
      actual_clock_in: actualIn,
      actual_clock_out: actualOut,
      late_minutes: 0,
      early_leave_minutes: 0,
      overtime_minutes: 0,
      missing_clock_in: fi == null,
      missing_clock_out: fi != null && lo == null,
      absent: false,
      scheduled_hours_ms: 0,
      worked_hours_ms: workedMs,
      status: "unscheduled_punch",
    };
  }

  if (!hasSchedule) {
    return {
      date: params.ymd,
      scheduled_start: null,
      scheduled_end: null,
      actual_clock_in: null,
      actual_clock_out: null,
      late_minutes: 0,
      early_leave_minutes: 0,
      overtime_minutes: 0,
      missing_clock_in: false,
      missing_clock_out: false,
      absent: false,
      scheduled_hours_ms: 0,
      worked_hours_ms: 0,
      status: "off_day",
    };
  }

  const schedMinutes = Math.max(0, minutesBetween(scheduledStart!, scheduledEnd!) - breakMin);
  const scheduledMs = schedMinutes * 60_000;

  if (!hasPunches) {
    return {
      date: params.ymd,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      actual_clock_in: null,
      actual_clock_out: null,
      late_minutes: 0,
      early_leave_minutes: 0,
      overtime_minutes: 0,
      missing_clock_in: false,
      missing_clock_out: false,
      absent: true,
      scheduled_hours_ms: scheduledMs,
      worked_hours_ms: 0,
      status: "absent",
    };
  }

  const schedStartMs = new Date(`${params.ymd}T${scheduledStart}:00`).getTime();
  let schedEndMs = new Date(`${params.ymd}T${scheduledEnd}:00`).getTime();
  if (schedEndMs <= schedStartMs) schedEndMs += 24 * 60 * 60 * 1000;

  const lateMinutes =
    inMs != null ? Math.max(0, Math.round((inMs - schedStartMs) / 60000)) : 0;
  const earlyLeaveMinutes =
    outMs != null ? Math.max(0, Math.round((schedEndMs - outMs) / 60000)) : 0;
  const overtimeMinutes =
    outMs != null ? Math.max(0, Math.round((outMs - schedEndMs) / 60000)) : 0;

  const missingClockIn = fi == null;
  const missingClockOut = fi != null && lo == null;

  let status: ShiftMatchStatus = "on_time";
  if (missingClockIn && missingClockOut) status = "missing_clock_in";
  else if (missingClockIn) status = "missing_clock_in";
  else if (missingClockOut) status = "missing_clock_out";
  else if (lateMinutes > 5) status = "late";
  else if (earlyLeaveMinutes > 5) status = "early_leave";
  else if (overtimeMinutes > 10) status = "overtime";

  return {
    date: params.ymd,
    scheduled_start: scheduledStart,
    scheduled_end: scheduledEnd,
    actual_clock_in: actualIn,
    actual_clock_out: actualOut,
    late_minutes: lateMinutes,
    early_leave_minutes: earlyLeaveMinutes,
    overtime_minutes: overtimeMinutes,
    missing_clock_in: missingClockIn,
    missing_clock_out: missingClockOut,
    absent: false,
    scheduled_hours_ms: scheduledMs,
    worked_hours_ms: workedMs,
    status,
  };
}


import {
  attendanceForTotals,
  computeValidPunchDay,
  firstClockIn,
  lastClockOut,
  sortByEventTime,
  type AttendanceRecord,
} from "@/lib/attendance";
import { matchesEventDate, recordEventInstant, recordEventTime } from "@/lib/attendance-db";
import { malaysiaDateYmd, parseMalaysiaEventInstant } from "@/lib/malaysia-time";
import { addDaysYmd } from "@/lib/attendance";
import {
  formatMinutesAsTime,
  parseTimeToMinutes,
  scheduledMsForDay,
  scheduledSlotsForDate,
  type StaffScheduleProfile,
} from "@/lib/staff-schedule";
import type { StaffScheduleRow } from "@/lib/shifts/staff-schedules-db";
import { matchStaffDayWithShopSchedule } from "@/lib/shop-schedule-resolve";
import { pickPrimaryScheduleForDay } from "@/lib/shifts/schedule-attendance-match";
import type { ShopSchedulingFields } from "@/lib/shop-scheduling";
import { matchAttendanceToScheduledShift } from "@/lib/shifts/shift-match";

export type ShiftAttendanceStatus =
  | "on_time"
  | "late"
  | "early_leave"
  | "absent"
  | "missing_clock_out"
  | "open_shift"
  | "in_shift"
  | "waiting_for_next_shift"
  | "completed"
  | "upcoming"
  | "unscheduled_punch"
  | "off_day";

export type DayShiftComparison = {
  date: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_clock_in: string | null;
  actual_clock_out: string | null;
  late_minutes: number;
  early_leave_minutes: number;
  overtime_minutes?: number;
  early_arrival_minutes?: number;
  scheduled_hours_ms: number;
  actual_hours_ms: number;
  status: ShiftAttendanceStatus;
};

export type MonthShiftPerformance = {
  scheduled_days: number;
  present_days: number;
  late_count: number;
  absent_count: number;
  early_leave_count: number;
  actual_hours_ms: number;
  scheduled_hours_ms: number;
  reliability_percent: number;
  daily: DayShiftComparison[];
};

function mergeSlotRange(slots: ReturnType<typeof scheduledSlotsForDate>): {
  start: string;
  end: string;
} | null {
  if (slots.length === 0) return null;
  let startMin = parseTimeToMinutes(slots[0]!.start_time);
  let endMin = parseTimeToMinutes(slots[0]!.end_time);
  for (const s of slots.slice(1)) {
    startMin = Math.min(startMin, parseTimeToMinutes(s.start_time));
    let e = parseTimeToMinutes(s.end_time);
    const st = parseTimeToMinutes(s.start_time);
    if (e <= st) e += 24 * 60;
    endMin = Math.max(endMin, e);
  }
  return { start: formatMinutesAsTime(startMin), end: formatMinutesAsTime(endMin) };
}

export function compareDayShift(
  profile: StaffScheduleProfile,
  ymd: string,
  history: AttendanceRecord[],
): DayShiftComparison {
  const slots = scheduledSlotsForDate(profile, ymd);
  const range = mergeSlotRange(slots);
  const scheduledMs = scheduledMsForDay(profile, ymd);
  const dayRows = sortByEventTime(attendanceForTotals(history.filter((r) => matchesEventDate(r, ymd))));
  const valid = computeValidPunchDay(dayRows);
  const actualMs = valid.totalMs;

  const fi = firstClockIn(dayRows);
  const lo = lastClockOut(dayRows);
  const hasOpenIn = valid.openIn != null;
  const actualIn = fi ? recordEventTime(fi) : null;
  const actualOut = hasOpenIn ? null : lo ? recordEventTime(lo) : null;
  const actualInMs = fi ? recordEventInstant(fi) : null;
  const actualOutMs = hasOpenIn ? null : lo ? recordEventInstant(lo) : null;

  if (!range && dayRows.length > 0) {
    return {
      date: ymd,
      scheduled_start: null,
      scheduled_end: null,
      actual_clock_in: actualIn,
      actual_clock_out: actualOut,
      late_minutes: 0,
      early_leave_minutes: 0,
      scheduled_hours_ms: 0,
      actual_hours_ms: actualMs,
      status: "unscheduled_punch",
    };
  }

  if (!range) {
    return {
      date: ymd,
      scheduled_start: null,
      scheduled_end: null,
      actual_clock_in: null,
      actual_clock_out: null,
      late_minutes: 0,
      early_leave_minutes: 0,
      scheduled_hours_ms: 0,
      actual_hours_ms: 0,
      status: slots.length === 0 ? "off_day" : "absent",
    };
  }

  if (dayRows.length === 0) {
    return {
      date: ymd,
      scheduled_start: range.start,
      scheduled_end: range.end,
      actual_clock_in: null,
      actual_clock_out: null,
      late_minutes: 0,
      early_leave_minutes: 0,
      scheduled_hours_ms: scheduledMs,
      actual_hours_ms: 0,
      status: "absent",
    };
  }

  const schedStartMs =
    parseMalaysiaEventInstant(ymd, `${range.start}:00`) ?? new Date(`${ymd}T${range.start}:00+08:00`).getTime();
  let schedEndMs =
    parseMalaysiaEventInstant(ymd, `${range.end}:00`) ?? new Date(`${ymd}T${range.end}:00+08:00`).getTime();
  if (schedEndMs <= schedStartMs) schedEndMs += 24 * 60 * 60 * 1000;

  const inMs = actualInMs;
  const outMs = actualOutMs;

  const lateMinutes =
    inMs != null ? Math.max(0, Math.round((inMs - schedStartMs) / 60000)) : 0;
  const earlyLeaveMinutes =
    outMs != null
      ? outMs >= schedEndMs
        ? 0
        : Math.max(0, Math.round((schedEndMs - outMs) / 60000))
      : 0;

  let status: ShiftAttendanceStatus = "on_time";
  if (hasOpenIn && fi) {
    const isToday = ymd === malaysiaDateYmd(new Date());
    if (!isToday) {
      status = "missing_clock_out";
    } else {
      const graceMinutes = 30;
      const overdue = Date.now() > schedEndMs + graceMinutes * 60_000;
      status = overdue ? "missing_clock_out" : "open_shift";
    }
  }
  else if (lateMinutes > 5) status = "late";
  else if (!hasOpenIn && earlyLeaveMinutes > 5) status = "early_leave";
  else if (lateMinutes > 0 || earlyLeaveMinutes > 0) status = "on_time";

  return {
    date: ymd,
    scheduled_start: range.start,
    scheduled_end: range.end,
    actual_clock_in: actualIn,
    actual_clock_out: actualOut,
    late_minutes: lateMinutes,
    early_leave_minutes: hasOpenIn ? 0 : earlyLeaveMinutes,
    scheduled_hours_ms: scheduledMs,
    actual_hours_ms: actualMs,
    status,
  };
}

export function ymdsInRange(fromYmd: string, toYmd: string): string[] {
  const days: string[] = [];
  let cur = fromYmd;
  while (cur <= toYmd) {
    days.push(cur);
    cur = addDaysYmd(cur, 1);
    if (days.length > 400) break;
  }
  return days;
}

export function buildMonthShiftPerformance(
  profile: StaffScheduleProfile,
  monthYmd: string,
  daysInMonth: number,
  history: AttendanceRecord[],
  explicit?: Map<string, StaffScheduleRow[]>,
  shopScheduling?: ShopSchedulingFields | null,
): MonthShiftPerformance {
  const [y, mo] = monthYmd.split("-");
  const ymds: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    ymds.push(`${y}-${mo}-${String(d).padStart(2, "0")}`);
  }
  return buildRangeShiftPerformance(profile, ymds, history, explicit, shopScheduling);
}

export function buildRangeShiftPerformance(
  profile: StaffScheduleProfile,
  ymds: string[],
  history: AttendanceRecord[],
  explicit?: Map<string, StaffScheduleRow[]>,
  shopScheduling?: ShopSchedulingFields | null,
): MonthShiftPerformance {
  const daily: DayShiftComparison[] = [];
  let scheduledDays = 0;
  let presentDays = 0;
  let lateCount = 0;
  let absentCount = 0;
  let earlyLeaveCount = 0;
  let actualMs = 0;
  let scheduledMs = 0;

  function pickBestScheduleForDay(schedules: StaffScheduleRow[], dayRows: AttendanceRecord[]): StaffScheduleRow | null {
    return pickPrimaryScheduleForDay({ schedules, dayRows, shopIdFilter: null });
  }

  for (const ymd of ymds) {
    const dayRows = history.filter((r) => matchesEventDate(r, ymd));
    const daySchedules = explicit?.get(ymd) ?? [];
    const explicitRow = pickBestScheduleForDay(daySchedules, dayRows);
    const cmp = shopScheduling
      ? (() => {
          const matched = matchStaffDayWithShopSchedule({
            ymd,
            shop: shopScheduling,
            explicitRow,
            explicitRows: daySchedules,
            allSchedulesForDay: daySchedules,
            history,
          });
          return {
            date: ymd,
            scheduled_start: matched.scheduled_start,
            scheduled_end: matched.scheduled_end,
            actual_clock_in: matched.actual_clock_in,
            actual_clock_out: matched.actual_clock_out,
            late_minutes: matched.late_minutes,
            early_leave_minutes: matched.early_leave_minutes,
            overtime_minutes: matched.overtime_minutes,
            scheduled_hours_ms: matched.scheduled_hours_ms,
            actual_hours_ms: matched.worked_hours_ms,
            status:
              matched.status === "missing_clock_out"
                ? "missing_clock_out"
                : matched.status === "open_shift"
                  ? "open_shift"
                : matched.status === "waiting_for_next_shift"
                  ? "waiting_for_next_shift"
                : matched.status === "completed"
                  ? "completed"
                : matched.status === "in_shift"
                  ? "in_shift"
                : matched.status === "upcoming"
                  ? "upcoming"
                : matched.status === "unscheduled_punch"
                  ? "unscheduled_punch"
                  : matched.status === "absent"
                    ? "absent"
                    : matched.status === "early_leave"
                      ? "early_leave"
                      : matched.status === "late"
                        ? "late"
                        : matched.status === "off_day"
                          ? "off_day"
                          : "on_time",
          } satisfies DayShiftComparison;
        })()
      : explicitRow
      ? (() => {
          const matched = matchAttendanceToScheduledShift({
            ymd,
            scheduledStart: explicitRow.start_time,
            scheduledEnd: explicitRow.end_time,
            breakMinutes: explicitRow.break_minutes,
            history,
          });
          return {
            date: ymd,
            scheduled_start: matched.scheduled_start,
            scheduled_end: matched.scheduled_end,
            actual_clock_in: matched.actual_clock_in,
            actual_clock_out: matched.actual_clock_out,
            late_minutes: matched.late_minutes,
            early_leave_minutes: matched.early_leave_minutes,
            overtime_minutes: matched.overtime_minutes,
            scheduled_hours_ms: matched.scheduled_hours_ms,
            actual_hours_ms: matched.worked_hours_ms,
            status:
              matched.status === "missing_clock_out"
                ? "missing_clock_out"
                : matched.status === "open_shift"
                  ? "open_shift"
                : matched.status === "unscheduled_punch"
                  ? "unscheduled_punch"
                  : matched.status === "absent"
                    ? "absent"
                    : matched.status === "early_leave"
                      ? "early_leave"
                      : matched.status === "late"
                        ? "late"
                        : "on_time",
          } satisfies DayShiftComparison;
        })()
      : compareDayShift(profile, ymd, history);

    daily.push(cmp);

    if (shopScheduling?.work_time_mode === "fixed") {
      scheduledDays += 1;
      scheduledMs += cmp.scheduled_hours_ms;
    } else if (explicitRow) {
      scheduledDays += 1;
      scheduledMs += cmp.scheduled_hours_ms;
    } else {
      const legacySlots = scheduledSlotsForDate(profile, ymd);
      if (legacySlots.length > 0 || profile.schedule_mode === "fixed_daily") {
        scheduledDays += 1;
        scheduledMs += cmp.scheduled_hours_ms;
      }
    }
    if (cmp.actual_hours_ms > 0) presentDays += 1;
    actualMs += cmp.actual_hours_ms;
    if (cmp.status === "late") lateCount += 1;
    if (cmp.status === "absent" && cmp.scheduled_start) absentCount += 1;
    if (cmp.status === "early_leave") earlyLeaveCount += 1;
  }

  const reliability =
    scheduledDays > 0 ? Math.round((presentDays / scheduledDays) * 1000) / 10 : 100;

  return {
    scheduled_days: scheduledDays,
    present_days: presentDays,
    late_count: lateCount,
    absent_count: absentCount,
    early_leave_count: earlyLeaveCount,
    actual_hours_ms: actualMs,
    scheduled_hours_ms: scheduledMs,
    reliability_percent: reliability,
    daily,
  };
}

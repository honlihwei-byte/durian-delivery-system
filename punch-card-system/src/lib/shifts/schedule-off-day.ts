import type { StaffScheduleRow } from "@/lib/shifts/staff-schedules-db";

/** Approved leave / rest codes stored in schedule cells (not timed shifts). */
export const SCHEDULE_LEAVE_CODES = ["RD", "MC", "AL", "UL", "EL"] as const;
export type ScheduleLeaveCode = (typeof SCHEDULE_LEAVE_CODES)[number];

/** Labels stored in schedule cells that mean rest/off day (not a timed shift). */
const OFF_DAY_LABELS = new Set([
  "rd",
  "off",
  "rest day",
  "off day",
  "rest_day",
  "off_day",
  "restday",
  "offday",
]);

export type ScheduleNonWorkingStatus = "off_day" | "mc" | "al" | "ul" | "el";

/** True when value is a known leave code (RD, MC, AL, UL, EL). */
export function isScheduleLeaveCode(value: string | null | undefined): value is ScheduleLeaveCode {
  if (!value) return false;
  return SCHEDULE_LEAVE_CODES.includes(value.trim().toUpperCase() as ScheduleLeaveCode);
}

/** True when a raw schedule time field is an off/rest-day label (RD, OFF, etc.). */
export function isOffDayScheduleLabel(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
  if (!normalized) return false;
  if (OFF_DAY_LABELS.has(normalized)) return true;
  if (isScheduleLeaveCode(value)) return true;
  return normalized === "r d" || normalized === "r.d.";
}

/** Resolve leave/rest code from raw schedule fields. */
export function resolveScheduleLeaveCode(
  start: string | null | undefined,
  end: string | null | undefined,
  isOffDayFlag?: boolean,
): ScheduleLeaveCode | null {
  const rawStart = start?.trim() ?? "";
  const rawEnd = end?.trim() ?? "";
  if (isScheduleLeaveCode(rawStart)) return rawStart.toUpperCase() as ScheduleLeaveCode;
  if (isScheduleLeaveCode(rawEnd)) return rawEnd.toUpperCase() as ScheduleLeaveCode;
  if (
    rawStart &&
    rawEnd &&
    rawStart.toLowerCase() === rawEnd.toLowerCase() &&
    isScheduleLeaveCode(rawStart)
  ) {
    return rawStart.toUpperCase() as ScheduleLeaveCode;
  }
  if (isOffDayScheduleLabel(rawStart) || isOffDayScheduleLabel(rawEnd) || isOffDayFlag === true) {
    return "RD";
  }
  return null;
}

export function getScheduleLeaveCode(
  row: Pick<StaffScheduleRow, "is_off_day" | "start_time" | "end_time"> | null | undefined,
): ScheduleLeaveCode | null {
  if (!row) return null;
  return resolveScheduleLeaveCode(row.start_time, row.end_time, row.is_off_day);
}

/** Attendance report status for a non-working schedule row. */
export function attendanceStatusForLeaveCode(code: ScheduleLeaveCode): ScheduleNonWorkingStatus {
  switch (code) {
    case "RD":
      return "off_day";
    case "MC":
      return "mc";
    case "AL":
      return "al";
    case "UL":
      return "ul";
    case "EL":
      return "el";
  }
}

export function attendanceStatusForScheduleRow(
  row: Pick<StaffScheduleRow, "is_off_day" | "start_time" | "end_time">,
): ScheduleNonWorkingStatus | null {
  const code = getScheduleLeaveCode(row);
  return code ? attendanceStatusForLeaveCode(code) : null;
}

/** True when a staff schedule row is rest day or approved leave (not a working shift). */
export function isStaffScheduleNonWorkingDay(
  row: Pick<StaffScheduleRow, "is_off_day" | "start_time" | "end_time"> | null | undefined,
): boolean {
  return getScheduleLeaveCode(row) !== null;
}

/** @deprecated Use isStaffScheduleNonWorkingDay — kept for existing imports. */
export function isStaffScheduleOffDay(
  row: Pick<StaffScheduleRow, "is_off_day" | "start_time" | "end_time"> | null | undefined,
): boolean {
  return isStaffScheduleNonWorkingDay(row);
}

/** True when row is an active timed working shift. */
export function isStaffScheduleWorkingShift(
  row: Pick<StaffScheduleRow, "status" | "is_off_day" | "start_time" | "end_time"> | null | undefined,
): boolean {
  if (!row || row.status !== "active") return false;
  if (isStaffScheduleNonWorkingDay(row)) return false;
  return Boolean(row.start_time?.trim() && row.end_time?.trim());
}

/** Pick the active non-working schedule (RD / leave) for a staff day, if any. */
export function pickNonWorkingScheduleForDay(
  schedules: StaffScheduleRow[],
  shopIdFilter?: string | null,
): StaffScheduleRow | null {
  let candidates = (schedules ?? []).filter(
    (s) => s.status === "active" && isStaffScheduleNonWorkingDay(s),
  );
  if (shopIdFilter) {
    const atShop = candidates.filter((s) => s.shop_id === shopIdFilter);
    if (atShop.length > 0) candidates = atShop;
  }
  return candidates[0] ?? null;
}

/** @deprecated Use pickNonWorkingScheduleForDay */
export function pickOffDayScheduleForDay(
  schedules: StaffScheduleRow[],
  shopIdFilter?: string | null,
): StaffScheduleRow | null {
  return pickNonWorkingScheduleForDay(schedules, shopIdFilter);
}

/** Display label for schedule grid / reports. */
export function offDayScheduleDisplayLabel(
  row: Pick<StaffScheduleRow, "is_off_day" | "start_time" | "end_time">,
): string {
  const code = getScheduleLeaveCode(row);
  if (code) return code;
  if (row.start_time?.trim()) return row.start_time.trim();
  return "RD";
}

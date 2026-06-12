import type { StaffScheduleRow } from "@/lib/shifts/staff-schedules-db";

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

/** True when a raw schedule time field is an off/rest-day label (RD, OFF, etc.). */
export function isOffDayScheduleLabel(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
  if (!normalized) return false;
  if (OFF_DAY_LABELS.has(normalized)) return true;
  // Also match compact forms like "R.D." → skip; keep strict
  return normalized === "r d" || normalized === "r.d.";
}

/** True when a staff schedule row represents a rest/off day. */
export function isStaffScheduleOffDay(
  row: Pick<StaffScheduleRow, "is_off_day" | "start_time" | "end_time"> | null | undefined,
): boolean {
  if (!row) return false;
  if (row.is_off_day === true) return true;
  const start = row.start_time?.trim() ?? "";
  const end = row.end_time?.trim() ?? "";
  if (!start && !end) return false;
  if (isOffDayScheduleLabel(start) || isOffDayScheduleLabel(end)) return true;
  if (start && end && start.toLowerCase() === end.toLowerCase() && isOffDayScheduleLabel(start)) {
    return true;
  }
  return false;
}

/** Pick the active off-day schedule for a staff day, if any. */
export function pickOffDayScheduleForDay(
  schedules: StaffScheduleRow[],
  shopIdFilter?: string | null,
): StaffScheduleRow | null {
  let candidates = (schedules ?? []).filter((s) => s.status === "active" && isStaffScheduleOffDay(s));
  if (shopIdFilter) {
    const atShop = candidates.filter((s) => s.shop_id === shopIdFilter);
    if (atShop.length > 0) candidates = atShop;
  }
  return candidates[0] ?? null;
}

/** Display label for schedule grid / reports. */
export function offDayScheduleDisplayLabel(
  row: Pick<StaffScheduleRow, "is_off_day" | "start_time" | "end_time">,
): string {
  if (row.start_time?.trim()) return row.start_time.trim();
  return "RD";
}

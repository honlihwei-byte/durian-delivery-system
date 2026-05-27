import { shopSchedulingFromRow, type ShopSchedulingFields } from "@/lib/shop-scheduling";
import { matchAttendanceToScheduledShift, type ShiftMatchResult } from "@/lib/shifts/shift-match";
import type { AttendanceRecord } from "@/lib/attendance";
import type { StaffScheduleRow } from "@/lib/shifts/staff-schedules-db";

export type ResolvedStaffSchedule = {
  scheduled_start: string | null;
  scheduled_end: string | null;
  break_minutes: number;
  is_off_day: boolean;
  source: "shop_fixed" | "staff_shift" | "none";
};

function hhmm(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = String(v).trim();
  return s.length >= 5 ? s.slice(0, 5) : null;
}

export function resolveScheduleFromShop(
  shopRow: Record<string, unknown>,
): ResolvedStaffSchedule {
  const shop = shopSchedulingFromRow(shopRow);
  return {
    scheduled_start: shop.opening_time,
    scheduled_end: shop.closing_time,
    break_minutes: shop.break_minutes,
    is_off_day: false,
    source: "shop_fixed",
  };
}

export function resolveScheduleFromStaffRow(
  row: StaffScheduleRow | null | undefined,
): ResolvedStaffSchedule {
  if (!row || row.status !== "active") {
    return { scheduled_start: null, scheduled_end: null, break_minutes: 0, is_off_day: false, source: "none" };
  }
  if (row.is_off_day) {
    return { scheduled_start: null, scheduled_end: null, break_minutes: 0, is_off_day: true, source: "staff_shift" };
  }
  return {
    scheduled_start: hhmm(row.start_time),
    scheduled_end: hhmm(row.end_time),
    break_minutes: row.break_minutes ?? 0,
    is_off_day: false,
    source: "staff_shift",
  };
}

export function resolveStaffDaySchedule(
  shop: ShopSchedulingFields,
  explicitRow: StaffScheduleRow | null | undefined,
): ResolvedStaffSchedule {
  if (shop.work_time_mode === "fixed") {
    return {
      scheduled_start: shop.opening_time,
      scheduled_end: shop.closing_time,
      break_minutes: shop.break_minutes,
      is_off_day: false,
      source: "shop_fixed",
    };
  }
  return resolveScheduleFromStaffRow(explicitRow);
}

export function matchStaffDayWithShopSchedule(params: {
  ymd: string;
  shop: ShopSchedulingFields | null;
  explicitRow: StaffScheduleRow | null | undefined;
  history: AttendanceRecord[];
}): ShiftMatchResult {
  const resolved = params.shop
    ? resolveStaffDaySchedule(params.shop, params.explicitRow)
    : resolveScheduleFromStaffRow(params.explicitRow);
  return matchAttendanceToScheduledShift({
    ymd: params.ymd,
    scheduledStart: resolved.scheduled_start,
    scheduledEnd: resolved.scheduled_end,
    breakMinutes: resolved.break_minutes,
    isOffDay: resolved.is_off_day,
    history: params.history,
  });
}

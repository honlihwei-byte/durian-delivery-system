import { buildAttendanceEventFields } from "@/lib/attendance-event-time";
import type { AttendanceRecord } from "@/lib/attendance";
import { formatEventTimeDisplay, malaysiaDateYmd, malaysiaDayUtcBounds } from "@/lib/malaysia-time";
import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

/** Columns that exist on legacy and current Supabase attendance tables. */
export const ATTENDANCE_SELECT =
  "id, shop_id, shop_name, staff_id, staff_name, staff_code, staff_type, action_type, event_date, event_time, staff_latitude, staff_longitude, distance_from_shop_meters, gps_accuracy_meters, gps_verified, client_device_time, created_at";

/** Minimal columns returned after clock punch (faster insert). */
export const ATTENDANCE_PUNCH_SELECT = "id, event_time, created_at, gps_verified, distance_from_shop_meters";

/** Fast verified punch — id + display time only. */
export const ATTENDANCE_FAST_PUNCH_SELECT = "id, event_time, created_at";

/** Malaysia calendar date for a row (from UTC created_at). */
export function recordEventDate(row: Pick<AttendanceRecord, "created_at">): string {
  return malaysiaDateYmd(new Date(row.created_at));
}

/** Malaysia HH:mm:ss for display. */
export function recordEventTime(row: Pick<AttendanceRecord, "event_time" | "created_at">): string {
  return formatEventTimeDisplay(row.event_time, row.created_at);
}

export function normalizeAttendanceRecord(row: Record<string, unknown>): AttendanceRecord {
  const created_at = String(row.created_at ?? new Date().toISOString());
  const instant = new Date(created_at);
  const derived = buildAttendanceEventFields(instant);
  const event_time = formatEventTimeDisplay(
    row.event_time != null ? String(row.event_time) : null,
    created_at,
  );

  return {
    id: String(row.id),
    shop_id: String(row.shop_id),
    shop_name: String(row.shop_name),
    staff_id: String(row.staff_id),
    staff_name: String(row.staff_name),
    staff_code: String(row.staff_code),
    staff_type: String(row.staff_type),
    action_type: row.action_type as "clock_in" | "clock_out",
    event_date: malaysiaDateYmd(instant),
    event_time: event_time === "—" ? derived.event_time : event_time,
    staff_latitude: row.staff_latitude as number | null | undefined,
    staff_longitude: row.staff_longitude as number | null | undefined,
    distance_from_shop_meters: row.distance_from_shop_meters as number | null | undefined,
    gps_accuracy_meters: row.gps_accuracy_meters as number | null | undefined,
    gps_verified: row.gps_verified as boolean | null | undefined,
    client_device_time: row.client_device_time as string | null | undefined,
    created_at,
  };
}

export function matchesEventDate(row: Pick<AttendanceRecord, "created_at">, ymd: string): boolean {
  return recordEventDate(row) === ymd;
}

export function isEventDateInRange(
  row: Pick<AttendanceRecord, "created_at">,
  fromYmd: string,
  toYmd: string,
): boolean {
  const d = recordEventDate(row);
  return d >= fromYmd && d <= toYmd;
}

function mapRows(data: Record<string, unknown>[] | null): AttendanceRecord[] {
  return (data ?? []).map((row) => normalizeAttendanceRecord(row));
}

/** Load attendance for one Malaysia calendar day. */
export async function fetchAttendanceForDay(
  supabase: Supabase,
  date: string,
  shopId: string | null,
): Promise<AttendanceRecord[]> {
  let q = supabase
    .from("attendance")
    .select(ATTENDANCE_SELECT)
    .eq("event_date", date)
    .order("created_at", { ascending: true });
  if (shopId) q = q.eq("shop_id", shopId);

  const { data, error } = await q;
  if (!error) {
    return mapRows(data as Record<string, unknown>[] | null).filter((r) => matchesEventDate(r, date));
  }

  const { start, end } = malaysiaDayUtcBounds(date);
  let q2 = supabase
    .from("attendance")
    .select(ATTENDANCE_SELECT)
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: true });
  if (shopId) q2 = q2.eq("shop_id", shopId);
  const { data: data2, error: error2 } = await q2;
  if (error2) throw error2;
  return mapRows(data2 as Record<string, unknown>[] | null).filter((r) => matchesEventDate(r, date));
}

/** Load attendance between two YYYY-MM-DD Malaysia dates inclusive. */
export async function fetchAttendanceInRange(
  supabase: Supabase,
  from: string,
  to: string,
  shopId: string | null,
): Promise<AttendanceRecord[]> {
  let q = supabase
    .from("attendance")
    .select(ATTENDANCE_SELECT)
    .gte("event_date", from)
    .lte("event_date", to)
    .order("created_at", { ascending: true });
  if (shopId) q = q.eq("shop_id", shopId);

  const { data, error } = await q;
  if (!error) {
    return mapRows(data as Record<string, unknown>[] | null).filter((r) =>
      isEventDateInRange(r, from, to),
    );
  }

  const { start } = malaysiaDayUtcBounds(from);
  const { end } = malaysiaDayUtcBounds(to);
  let q2 = supabase
    .from("attendance")
    .select(ATTENDANCE_SELECT)
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: true });
  if (shopId) q2 = q2.eq("shop_id", shopId);
  const { data: data2, error: error2 } = await q2;
  if (error2) throw error2;
  return mapRows(data2 as Record<string, unknown>[] | null).filter((r) =>
    isEventDateInRange(r, from, to),
  );
}

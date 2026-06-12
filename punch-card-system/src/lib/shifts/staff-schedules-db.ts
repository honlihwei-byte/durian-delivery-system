import type { createAdminClient } from "@/lib/supabase/admin";
import {
  isOffDayScheduleLabel,
  isScheduleStatusCode,
  resolveScheduleStatusCode,
} from "@/lib/shifts/schedule-off-day";
import {
  getScheduleType,
  isNonShiftScheduleType,
  isShiftScheduleType,
  type ScheduleType,
} from "@/lib/shifts/schedule-type";
import { dedupeExactDuplicateSchedulesForCell } from "@/lib/shifts/staff-schedules-dedupe";
import { sortSchedulesForDay } from "@/lib/shifts/multi-shift-match";

type Supabase = ReturnType<typeof createAdminClient>;

export type RepeatType = "one_day" | "weekly" | "bi_weekly" | "monthly";
export type ScheduleStatus = "active" | "cancelled";

export type StaffScheduleRow = {
  id: string;
  company_id: string | null;
  shop_id: string;
  staff_id: string;
  shift_date: string; // YYYY-MM-DD
  schedule_type: ScheduleType;
  start_time: string | null; // HH:mm:ss (or HH:mm)
  end_time: string | null;
  break_minutes: number;
  repeat_type: RepeatType;
  template_id: string | null;
  is_off_day: boolean;
  sequence_no: number;
  created_by: string | null;
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
};

function hhmm(v: string): string {
  const s = String(v ?? "").trim();
  if (isScheduleStatusCode(s)) return s.toUpperCase();
  if (isOffDayScheduleLabel(s)) return s;
  if (s.length >= 5) return s.slice(0, 5);
  return "09:00";
}

export function normalizeScheduleRow(row: Record<string, unknown>): StaffScheduleRow {
  const rawStart = row.start_time != null ? String(row.start_time).trim() : "";
  const rawEnd = row.end_time != null ? String(row.end_time).trim() : "";
  const rawType = row.schedule_type != null ? String(row.schedule_type).trim().toUpperCase() : "";
  const legacyCode = resolveScheduleStatusCode(rawStart, rawEnd, row.is_off_day === true);
  const schedule_type: ScheduleType =
    rawType === "SHIFT" ||
    rawType === "RD" ||
    rawType === "MC" ||
    rawType === "AL" ||
    rawType === "UL" ||
    rawType === "EL" ||
    rawType === "NOT_SCHEDULED"
      ? (rawType as ScheduleType)
      : legacyCode
        ? legacyCode === "NS"
          ? "NOT_SCHEDULED"
          : (legacyCode as ScheduleType)
        : "SHIFT";
  const isNonWorking = isNonShiftScheduleType(schedule_type);

  return {
    id: String(row.id),
    company_id: row.company_id != null ? String(row.company_id) : null,
    shop_id: String(row.shop_id),
    staff_id: String(row.staff_id),
    shift_date: String(row.shift_date),
    schedule_type,
    start_time: isNonWorking
      ? null
      : row.start_time != null
        ? hhmm(String(row.start_time))
        : null,
    end_time: isNonWorking
      ? null
      : row.end_time != null
        ? hhmm(String(row.end_time))
        : null,
    break_minutes: typeof row.break_minutes === "number" ? row.break_minutes : Number(row.break_minutes ?? 0) || 0,
    repeat_type: (row.repeat_type as RepeatType) ?? "one_day",
    template_id: row.template_id != null ? String(row.template_id) : null,
    is_off_day: isNonWorking,
    sequence_no:
      typeof row.sequence_no === "number"
        ? row.sequence_no
        : Number(row.sequence_no ?? 1) || 1,
    created_by: row.created_by != null ? String(row.created_by) : null,
    status: (row.status as ScheduleStatus) ?? "active",
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

const SCHEDULE_SELECT =
  "id, company_id, shop_id, staff_id, shift_date, schedule_type, start_time, end_time, break_minutes, repeat_type, template_id, is_off_day, sequence_no, created_by, status, created_at, updated_at";

export async function listStaffSchedules(
  supabase: Supabase,
  params: {
    companyId: string | null;
    shopId?: string | null;
    staffId?: string | null;
    from: string; // ymd
    to: string; // ymd
  },
): Promise<StaffScheduleRow[]> {
  let q = supabase
    .from("staff_schedules")
    .select(SCHEDULE_SELECT)
    .gte("shift_date", params.from)
    .lte("shift_date", params.to)
    .order("shift_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (params.companyId) q = q.eq("company_id", params.companyId);
  if (params.shopId) q = q.eq("shop_id", params.shopId);
  if (params.staffId) q = q.eq("staff_id", params.staffId);

  const { data, error } = await q;
  if (error) {
    const parts = [
      error.message,
      error.code ? `(${error.code})` : null,
      error.details ? `— ${error.details}` : null,
      error.hint ? `— ${error.hint}` : null,
    ].filter(Boolean);
    throw new Error(parts.join(" "));
  }
  return (data ?? []).map((r) => normalizeScheduleRow(r as Record<string, unknown>));
}

/** Active schedules for many staff in a date range (all shops). */
export async function listStaffSchedulesForStaffIds(
  supabase: Supabase,
  params: {
    companyId: string;
    staffIds: string[];
    from: string;
    to: string;
  },
): Promise<StaffScheduleRow[]> {
  if (params.staffIds.length === 0) return [];

  const { data, error } = await supabase
    .from("staff_schedules")
    .select(SCHEDULE_SELECT)
    .eq("company_id", params.companyId)
    .in("staff_id", params.staffIds)
    .gte("shift_date", params.from)
    .lte("shift_date", params.to)
    .eq("status", "active")
    .order("shift_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => normalizeScheduleRow(r as Record<string, unknown>));
}

export async function getShopNamesByIds(
  supabase: Supabase,
  shopIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (shopIds.length === 0) return out;
  const { data, error } = await supabase.from("shops").select("id, name").in("id", shopIds);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    out.set(String(row.id), String(row.name ?? "").trim() || "Shop");
  }
  return out;
}

export type CrossShopScheduleRow = StaffScheduleRow & { shop_name: string };

export async function loadSchedulesForStaffIdsInRange(
  supabase: Supabase,
  params: {
    staffIds: string[];
    from: string;
    to: string;
  },
): Promise<Map<string, Map<string, StaffScheduleRow[]>>> {
  const out = new Map<string, Map<string, StaffScheduleRow[]>>();
  if (params.staffIds.length === 0) return out;

  const { data, error } = await supabase
    .from("staff_schedules")
    .select(SCHEDULE_SELECT)
    .in("staff_id", params.staffIds)
    .gte("shift_date", params.from)
    .lte("shift_date", params.to)
    .eq("status", "active");

  if (error) throw new Error(error.message);
  for (const r of data ?? []) {
    const row = normalizeScheduleRow(r as Record<string, unknown>);
    let staffMap = out.get(row.staff_id);
    if (!staffMap) {
      staffMap = new Map<string, StaffScheduleRow[]>();
      out.set(row.staff_id, staffMap);
    }
    const existing = staffMap.get(row.shift_date) ?? [];
    existing.push(row);
    staffMap.set(row.shift_date, sortSchedulesForDay(existing));
  }
  return out;
}

export async function cancelActiveSchedulesForDay(
  supabase: Supabase,
  params: { shop_id: string; staff_id: string; shift_date: string },
): Promise<void> {
  const { error } = await supabase
    .from("staff_schedules")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("shop_id", params.shop_id)
    .eq("staff_id", params.staff_id)
    .eq("shift_date", params.shift_date)
    .eq("status", "active");
  if (error) throw new Error(error.message);
}

/** Cancel only timed SHIFT rows for a cell (preserves other shifts when replacing status). */
export async function cancelActiveShiftSchedulesForDay(
  supabase: Supabase,
  params: { shop_id: string; staff_id: string; shift_date: string },
): Promise<void> {
  const { error } = await supabase
    .from("staff_schedules")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("shop_id", params.shop_id)
    .eq("staff_id", params.staff_id)
    .eq("shift_date", params.shift_date)
    .eq("status", "active")
    .eq("schedule_type", "SHIFT");
  if (error) throw new Error(error.message);
}

export async function listActiveSchedulesForStaffDay(
  supabase: Supabase,
  params: { shop_id: string; staff_id: string; shift_date: string },
): Promise<StaffScheduleRow[]> {
  const { data, error } = await supabase
    .from("staff_schedules")
    .select(SCHEDULE_SELECT)
    .eq("shop_id", params.shop_id)
    .eq("staff_id", params.staff_id)
    .eq("shift_date", params.shift_date)
    .eq("status", "active")
    .order("start_time", { ascending: true })
    .order("sequence_no", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => normalizeScheduleRow(r as Record<string, unknown>));
}

async function nextSequenceNo(
  supabase: Supabase,
  params: { shop_id: string; staff_id: string; shift_date: string },
): Promise<number> {
  const existing = await listActiveSchedulesForStaffDay(supabase, params);
  if (existing.length === 0) return 1;
  return Math.max(...existing.map((r) => r.sequence_no ?? 1)) + 1;
}

/** Replace cell assignment: non-SHIFT cancels all rows; SHIFT replaces all SHIFT rows with one. */
export async function assignStaffScheduleDay(
  supabase: Supabase,
  row: Omit<StaffScheduleRow, "id" | "created_at" | "updated_at">,
): Promise<StaffScheduleRow> {
  const cell = {
    shop_id: row.shop_id,
    staff_id: row.staff_id,
    shift_date: row.shift_date,
  };

  const scheduleType = getScheduleType(row);
  if (isNonShiftScheduleType(scheduleType)) {
    await cancelActiveSchedulesForDay(supabase, cell);
    return createStaffSchedule(supabase, { ...row, schedule_type: scheduleType, sequence_no: 1 });
  }

  await cancelActiveShiftSchedulesForDay(supabase, cell);
  const created = await createStaffSchedule(supabase, { ...row, schedule_type: "SHIFT", sequence_no: 1 });
  await dedupeExactDuplicateSchedulesForCell(supabase, cell);
  return created;
}

/** Add another shift without cancelling existing rows. */
export async function addStaffScheduleShift(
  supabase: Supabase,
  row: Omit<StaffScheduleRow, "id" | "created_at" | "updated_at" | "sequence_no"> & {
    sequence_no?: number;
  },
): Promise<StaffScheduleRow> {
  const seq =
    row.sequence_no ??
    (await nextSequenceNo(supabase, {
      shop_id: row.shop_id,
      staff_id: row.staff_id,
      shift_date: row.shift_date,
    }));
  const scheduleType = getScheduleType(row);
  return createStaffSchedule(supabase, {
    ...row,
    schedule_type: scheduleType,
    sequence_no: seq,
  });
}

export async function createStaffSchedule(
  supabase: Supabase,
  row: Omit<StaffScheduleRow, "id" | "created_at" | "updated_at">,
): Promise<StaffScheduleRow> {
  const scheduleType = getScheduleType(row);
  const insert: Record<string, unknown> = {
    company_id: row.company_id,
    shop_id: row.shop_id,
    staff_id: row.staff_id,
    shift_date: row.shift_date,
    schedule_type: scheduleType,
    break_minutes: row.break_minutes,
    repeat_type: row.repeat_type,
    template_id: isShiftScheduleType(scheduleType) ? row.template_id : null,
    is_off_day: isNonShiftScheduleType(scheduleType),
    sequence_no: row.sequence_no ?? 1,
    created_by: row.created_by,
    status: row.status,
    updated_at: new Date().toISOString(),
  };
  if (isShiftScheduleType(scheduleType)) {
    insert.start_time = hhmm(row.start_time ?? "09:00");
    insert.end_time = hhmm(row.end_time ?? "18:00");
  } else {
    insert.start_time = null;
    insert.end_time = null;
  }

  const { data, error } = await supabase
    .from("staff_schedules")
    .insert(insert)
    .select(SCHEDULE_SELECT)
    .single();
  if (error || !data) throw new Error(error?.message || "Could not create schedule");
  return normalizeScheduleRow(data as Record<string, unknown>);
}

export async function updateStaffSchedule(
  supabase: Supabase,
  scheduleId: string,
  patch: Partial<
    Pick<
      StaffScheduleRow,
      | "shop_id"
      | "staff_id"
      | "shift_date"
      | "schedule_type"
      | "start_time"
      | "end_time"
      | "break_minutes"
      | "status"
      | "is_off_day"
    >
  >,
): Promise<StaffScheduleRow> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.shop_id !== undefined) updates.shop_id = patch.shop_id;
  if (patch.staff_id !== undefined) updates.staff_id = patch.staff_id;
  if (patch.shift_date !== undefined) updates.shift_date = patch.shift_date;
  if (patch.schedule_type !== undefined) {
    updates.schedule_type = patch.schedule_type;
    if (isNonShiftScheduleType(patch.schedule_type)) {
      updates.is_off_day = true;
      updates.start_time = null;
      updates.end_time = null;
    }
  }
  if (patch.start_time !== undefined) updates.start_time = patch.start_time != null ? hhmm(patch.start_time) : null;
  if (patch.end_time !== undefined) updates.end_time = patch.end_time != null ? hhmm(patch.end_time) : null;
  if (patch.break_minutes !== undefined) updates.break_minutes = patch.break_minutes;
  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.is_off_day !== undefined) {
    updates.is_off_day = patch.is_off_day;
    if (patch.is_off_day && patch.schedule_type === undefined) {
      updates.schedule_type = "RD";
      updates.start_time = null;
      updates.end_time = null;
    }
  }

  const { data, error } = await supabase
    .from("staff_schedules")
    .update(updates)
    .eq("id", scheduleId)
    .select(SCHEDULE_SELECT)
    .single();

  if (error || !data) throw new Error(error?.message || "Could not update schedule");
  return normalizeScheduleRow(data as Record<string, unknown>);
}

export async function cancelStaffSchedule(
  supabase: Supabase,
  scheduleId: string,
): Promise<void> {
  const { error } = await supabase
    .from("staff_schedules")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", scheduleId);
  if (error) throw new Error(error.message);
}


import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

export type RepeatType = "one_day" | "weekly" | "bi_weekly" | "monthly";
export type ScheduleStatus = "active" | "cancelled";

export type StaffScheduleRow = {
  id: string;
  company_id: string | null;
  shop_id: string;
  staff_id: string;
  shift_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm:ss (or HH:mm)
  end_time: string;
  break_minutes: number;
  repeat_type: RepeatType;
  created_by: string | null;
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
};

function hhmm(v: string): string {
  const s = String(v ?? "").trim();
  if (s.length >= 5) return s.slice(0, 5);
  return "09:00";
}

export function normalizeScheduleRow(row: Record<string, unknown>): StaffScheduleRow {
  return {
    id: String(row.id),
    company_id: row.company_id != null ? String(row.company_id) : null,
    shop_id: String(row.shop_id),
    staff_id: String(row.staff_id),
    shift_date: String(row.shift_date),
    start_time: hhmm(String(row.start_time ?? "09:00")),
    end_time: hhmm(String(row.end_time ?? "18:00")),
    break_minutes: typeof row.break_minutes === "number" ? row.break_minutes : Number(row.break_minutes ?? 0) || 0,
    repeat_type: (row.repeat_type as RepeatType) ?? "one_day",
    created_by: row.created_by != null ? String(row.created_by) : null,
    status: (row.status as ScheduleStatus) ?? "active",
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

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
    .select(
      "id, company_id, shop_id, staff_id, shift_date, start_time, end_time, break_minutes, repeat_type, created_by, status, created_at, updated_at",
    )
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

export async function loadSchedulesForStaffIdsInRange(
  supabase: Supabase,
  params: {
    staffIds: string[];
    from: string;
    to: string;
  },
): Promise<Map<string, Map<string, StaffScheduleRow>>> {
  const out = new Map<string, Map<string, StaffScheduleRow>>();
  if (params.staffIds.length === 0) return out;

  const { data, error } = await supabase
    .from("staff_schedules")
    .select("id, company_id, shop_id, staff_id, shift_date, start_time, end_time, break_minutes, repeat_type, created_by, status, created_at, updated_at")
    .in("staff_id", params.staffIds)
    .gte("shift_date", params.from)
    .lte("shift_date", params.to)
    .eq("status", "active");

  if (error) throw new Error(error.message);
  for (const r of data ?? []) {
    const row = normalizeScheduleRow(r as Record<string, unknown>);
    let staffMap = out.get(row.staff_id);
    if (!staffMap) {
      staffMap = new Map<string, StaffScheduleRow>();
      out.set(row.staff_id, staffMap);
    }
    // One shift per staff/day (if multiple exist, keep earliest start)
    const existing = staffMap.get(row.shift_date);
    if (!existing || row.start_time < existing.start_time) {
      staffMap.set(row.shift_date, row);
    }
  }
  return out;
}

export async function createStaffSchedule(
  supabase: Supabase,
  row: Omit<StaffScheduleRow, "id" | "created_at" | "updated_at">,
): Promise<StaffScheduleRow> {
  const { data, error } = await supabase
    .from("staff_schedules")
    .insert({
      ...row,
      start_time: hhmm(row.start_time),
      end_time: hhmm(row.end_time),
      updated_at: new Date().toISOString(),
    })
    .select(
      "id, company_id, shop_id, staff_id, shift_date, start_time, end_time, break_minutes, repeat_type, created_by, status, created_at, updated_at",
    )
    .single();
  if (error || !data) throw new Error(error?.message || "Could not create schedule");
  return normalizeScheduleRow(data as Record<string, unknown>);
}

export async function updateStaffSchedule(
  supabase: Supabase,
  scheduleId: string,
  patch: Partial<Pick<StaffScheduleRow, "shop_id" | "staff_id" | "shift_date" | "start_time" | "end_time" | "break_minutes" | "status">>,
): Promise<StaffScheduleRow> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.shop_id !== undefined) updates.shop_id = patch.shop_id;
  if (patch.staff_id !== undefined) updates.staff_id = patch.staff_id;
  if (patch.shift_date !== undefined) updates.shift_date = patch.shift_date;
  if (patch.start_time !== undefined) updates.start_time = hhmm(patch.start_time);
  if (patch.end_time !== undefined) updates.end_time = hhmm(patch.end_time);
  if (patch.break_minutes !== undefined) updates.break_minutes = patch.break_minutes;
  if (patch.status !== undefined) updates.status = patch.status;

  const { data, error } = await supabase
    .from("staff_schedules")
    .update(updates)
    .eq("id", scheduleId)
    .select(
      "id, company_id, shop_id, staff_id, shift_date, start_time, end_time, break_minutes, repeat_type, created_by, status, created_at, updated_at",
    )
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


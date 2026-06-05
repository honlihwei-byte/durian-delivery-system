import type { createAdminClient } from "@/lib/supabase/admin";
import {
  cancelStaffSchedule,
  listActiveSchedulesForStaffDay,
  type StaffScheduleRow,
} from "@/lib/shifts/staff-schedules-db";

type Supabase = ReturnType<typeof createAdminClient>;

export type ScheduleDedupeResult = {
  shop_id: string;
  staff_id: string;
  shift_date: string;
  kept_id: string;
  cancelled_ids: string[];
};

function pickWinner(rows: StaffScheduleRow[]): StaffScheduleRow {
  return [...rows].sort((a, b) => {
    const updatedDiff = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    if (updatedDiff !== 0) return updatedDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  })[0]!;
}

/** Keep one active row per staff/shop/date; cancel older duplicates. */
export async function dedupeActiveSchedulesForCell(
  supabase: Supabase,
  params: { shop_id: string; staff_id: string; shift_date: string },
): Promise<ScheduleDedupeResult | null> {
  const active = await listActiveSchedulesForStaffDay(supabase, params);
  if (active.length <= 1) return null;

  const winner = pickWinner(active);
  const losers = active.filter((row) => row.id !== winner.id);
  for (const row of losers) {
    await cancelStaffSchedule(supabase, row.id);
  }

  const result: ScheduleDedupeResult = {
    shop_id: params.shop_id,
    staff_id: params.staff_id,
    shift_date: params.shift_date,
    kept_id: winner.id,
    cancelled_ids: losers.map((row) => row.id),
  };

  console.info("[schedule-dedupe] cleaned duplicate assignments", result);
  return result;
}

/** Repair all duplicate active cells for one shop in a date range. */
export async function repairDuplicateSchedulesForShopInRange(
  supabase: Supabase,
  params: {
    company_id: string;
    shop_id: string;
    from: string;
    to: string;
  },
): Promise<{ repaired_cells: number; results: ScheduleDedupeResult[] }> {
  const { data, error } = await supabase
    .from("staff_schedules")
    .select("staff_id, shift_date")
    .eq("company_id", params.company_id)
    .eq("shop_id", params.shop_id)
    .eq("status", "active")
    .gte("shift_date", params.from)
    .lte("shift_date", params.to);

  if (error) throw new Error(error.message);

  const cellKeys = new Map<string, { staff_id: string; shift_date: string }>();
  for (const row of data ?? []) {
    const staff_id = String(row.staff_id);
    const shift_date = String(row.shift_date);
    cellKeys.set(`${staff_id}:${shift_date}`, { staff_id, shift_date });
  }

  const results: ScheduleDedupeResult[] = [];
  for (const cell of cellKeys.values()) {
    const deduped = await dedupeActiveSchedulesForCell(supabase, {
      shop_id: params.shop_id,
      staff_id: cell.staff_id,
      shift_date: cell.shift_date,
    });
    if (deduped) results.push(deduped);
  }

  if (results.length > 0) {
    console.info("[schedule-dedupe] repaired shop range", {
      shop_id: params.shop_id,
      from: params.from,
      to: params.to,
      repaired_cells: results.length,
    });
  }

  return { repaired_cells: results.length, results };
}

/** Pick the canonical active assignment for UI display. */
export function canonicalActiveScheduleRow(rows: StaffScheduleRow[]): StaffScheduleRow | null {
  const active = rows.filter((row) => row.status === "active");
  if (active.length === 0) return null;
  return pickWinner(active);
}

/** One row per staff/date for copy/repair operations. */
export function uniqueActiveCells(rows: StaffScheduleRow[]): StaffScheduleRow[] {
  const cells = new Map<string, StaffScheduleRow>();
  for (const row of rows) {
    if (row.status !== "active") continue;
    const key = `${row.staff_id}:${row.shift_date}`;
    const prev = cells.get(key);
    cells.set(key, prev ? pickWinner([prev, row]) : row);
  }
  return [...cells.values()];
}

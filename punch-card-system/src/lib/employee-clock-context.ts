import { malaysiaDateYmd } from "@/lib/malaysia-time";
import { getStaffAssignedShopIds } from "@/lib/permissions/staff-permissions-db";
import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

export type ClockContextResolution =
  | "scheduled"
  | "single_shop"
  | "pick_shop"
  | "none";

export type EmployeeClockContext = {
  resolution: ClockContextResolution;
  today: string;
  scheduled_shift: {
    shop_id: string;
    shop_name: string;
    start_time: string;
    end_time: string;
    is_off_day: boolean;
  } | null;
  assigned_shops: Array<{ id: string; name: string }>;
  selected_shop_id: string | null;
  can_clock: boolean;
  block_message: string | null;
};

export async function resolveEmployeeClockContext(
  supabase: Supabase,
  params: { staff_id: string; company_id: string },
): Promise<EmployeeClockContext> {
  const today = malaysiaDateYmd(new Date());

  const assignedIds = await getStaffAssignedShopIds(supabase, params.staff_id);
  let assignedShops: Array<{ id: string; name: string }> = [];
  if (assignedIds.length > 0) {
    const { data: shops } = await supabase
      .from("shops")
      .select("id, name")
      .in("id", assignedIds)
      .eq("company_id", params.company_id)
      .order("name");
    assignedShops = (shops ?? []).map((s) => ({ id: String(s.id), name: String(s.name) }));
  }

  const { data: scheduleRow } = await supabase
    .from("staff_schedules")
    .select("shop_id, start_time, end_time, is_off_day, shops(name)")
    .eq("staff_id", params.staff_id)
    .eq("company_id", params.company_id)
    .eq("shift_date", today)
    .eq("status", "active")
    .order("start_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  let scheduledShift: EmployeeClockContext["scheduled_shift"] = null;
  if (scheduleRow) {
    const shopJoin = scheduleRow.shops as { name?: string } | null;
    scheduledShift = {
      shop_id: String(scheduleRow.shop_id),
      shop_name: String(shopJoin?.name ?? ""),
      start_time: String(scheduleRow.start_time ?? ""),
      end_time: String(scheduleRow.end_time ?? ""),
      is_off_day: scheduleRow.is_off_day === true,
    };
  }

  if (assignedShops.length === 0) {
    return {
      resolution: "none",
      today,
      scheduled_shift: scheduledShift,
      assigned_shops: [],
      selected_shop_id: null,
      can_clock: false,
      block_message: "no_shop_assigned",
    };
  }

  if (scheduledShift && !scheduledShift.is_off_day) {
    const allowed = assignedShops.some((s) => s.id === scheduledShift!.shop_id);
    return {
      resolution: "scheduled",
      today,
      scheduled_shift: scheduledShift,
      assigned_shops: assignedShops,
      selected_shop_id: allowed ? scheduledShift.shop_id : null,
      can_clock: allowed,
      block_message: allowed ? null : "no_shop_assigned",
    };
  }

  if (assignedShops.length === 1) {
    return {
      resolution: "single_shop",
      today,
      scheduled_shift: scheduledShift,
      assigned_shops: assignedShops,
      selected_shop_id: assignedShops[0]!.id,
      can_clock: true,
      block_message: null,
    };
  }

  return {
    resolution: "pick_shop",
    today,
    scheduled_shift: scheduledShift,
    assigned_shops: assignedShops,
    selected_shop_id: null,
    can_clock: true,
    block_message: null,
  };
}

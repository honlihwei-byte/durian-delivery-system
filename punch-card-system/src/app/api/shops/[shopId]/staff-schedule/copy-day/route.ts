import { NextResponse } from "next/server";
import { isNextResponse } from "@/lib/admin-api-auth";
import { assertShopScope, requireCompanyFeatureAccess } from "@/lib/company-scope";
import { assignStaffScheduleDay, listStaffSchedules, type StaffScheduleRow } from "@/lib/shifts/staff-schedules-db";
import { createAdminClient } from "@/lib/supabase/admin";

function ymd(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("date must be YYYY-MM-DD");
  return s;
}

function prevDay(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Copy all staff schedules from previous day to target date for this shop. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ shopId: string }> },
) {
  const { shopId } = await ctx.params;
  try {
    const supabase = createAdminClient();
    const scope = await requireCompanyFeatureAccess(req, supabase);
    if (isNextResponse(scope)) return scope;
    const deny = await assertShopScope(supabase, shopId, scope.companyId);
    if (deny) return deny;

    const body = (await req.json()) as Record<string, unknown>;
    const target_date = ymd(body.target_date);
    const source_date = ymd(body.source_date ?? prevDay(target_date));

    const sourceRows = await listStaffSchedules(supabase, {
      companyId: scope.companyId,
      shopId,
      from: source_date,
      to: source_date,
    });

    const active = sourceRows.filter((r) => r.status === "active");
    const created: StaffScheduleRow[] = [];

    for (const src of active) {
      created.push(
        await assignStaffScheduleDay(supabase, {
          company_id: scope.companyId,
          shop_id: shopId,
          staff_id: src.staff_id,
          shift_date: target_date,
          start_time: src.start_time,
          end_time: src.end_time,
          break_minutes: src.break_minutes,
          repeat_type: "one_day",
          template_id: src.template_id,
          is_off_day: src.is_off_day,
          created_by: scope.session.companyCode ?? null,
          status: "active",
        } as Omit<StaffScheduleRow, "id" | "created_at" | "updated_at">),
      );
    }

    return NextResponse.json({ ok: true, copied: created.length, created });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

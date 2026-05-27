import { NextResponse } from "next/server";
import { isNextResponse } from "@/lib/admin-api-auth";
import { assertShopScope, requireCompanyFeatureAccess } from "@/lib/company-scope";
import { shopSchedulingFromRow } from "@/lib/shop-scheduling";
import {
  assignStaffScheduleDay,
  listStaffSchedules,
  type StaffScheduleRow,
} from "@/lib/shifts/staff-schedules-db";
import { listShopShiftTemplates } from "@/lib/shifts/shop-shift-templates-db";
import { listActiveStaffForShop } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";

function ymd(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("shift_date must be YYYY-MM-DD");
  return s;
}

function hhmm(v: unknown, field: string): string {
  const s = String(v ?? "").trim();
  if (!/^\d{2}:\d{2}/.test(s)) throw new Error(`${field} must be HH:mm`);
  return s.slice(0, 5);
}

function breakMinutes(v: unknown): number {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(600, Math.round(n));
}

export async function GET(
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

    const url = new URL(req.url);
    const from = ymd(url.searchParams.get("from"));
    const to = ymd(url.searchParams.get("to"));

    const { data: shopRow, error: shopErr } = await supabase
      .from("shops")
      .select("id, name, work_time_mode, opening_time, closing_time, break_minutes")
      .eq("id", shopId)
      .maybeSingle();
    if (shopErr || !shopRow) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const [staff, rows, templates] = await Promise.all([
      listActiveStaffForShop(supabase, shopId),
      listStaffSchedules(supabase, { companyId: scope.companyId, shopId, from, to }),
      listShopShiftTemplates(supabase, shopId),
    ]);

    return NextResponse.json({
      shop: { id: shopRow.id, name: shopRow.name, ...shopSchedulingFromRow(shopRow as Record<string, unknown>) },
      staff,
      rows,
      templates,
      from,
      to,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

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
    const staff_id = String(body.staff_id ?? "").trim();
    const shift_date = ymd(body.shift_date);
    const is_off_day = body.is_off_day === true;

    if (!staff_id) {
      return NextResponse.json({ error: "staff_id is required" }, { status: 400 });
    }

    let start_time: string | null = null;
    let end_time: string | null = null;
    let break_minutes = 0;
    let template_id: string | null = null;

    if (!is_off_day) {
      const templateIdRaw = String(body.template_id ?? "").trim();
      if (templateIdRaw) {
        const templates = await listShopShiftTemplates(supabase, shopId);
        const tpl = templates.find((t) => t.id === templateIdRaw);
        if (!tpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });
        start_time = tpl.start_time;
        end_time = tpl.end_time;
        break_minutes = tpl.break_minutes;
        template_id = tpl.id;
      } else {
        start_time = hhmm(body.start_time, "start_time");
        end_time = hhmm(body.end_time, "end_time");
        break_minutes = breakMinutes(body.break_minutes);
      }
    }

    const row = await assignStaffScheduleDay(supabase, {
      company_id: scope.companyId,
      shop_id: shopId,
      staff_id,
      shift_date,
      start_time,
      end_time,
      break_minutes,
      repeat_type: "one_day",
      template_id,
      is_off_day,
      created_by: scope.session.companyCode ?? null,
      status: "active",
    } as Omit<StaffScheduleRow, "id" | "created_at" | "updated_at">);

    return NextResponse.json({ ok: true, row });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

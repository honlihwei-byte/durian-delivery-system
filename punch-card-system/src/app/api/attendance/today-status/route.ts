import { NextResponse } from "next/server";
import { fetchAttendanceForDay } from "@/lib/attendance-db";
import {
  loadShopForPunch,
  validatePunchQrToken,
  validateStaffForPunch,
} from "@/lib/attendance-punch";
import { malaysiaDateYmd } from "@/lib/malaysia-time";
import { normalizePunchQrToken } from "@/lib/punch-qr-url";
import { matchStaffDayWithShopSchedule } from "@/lib/shop-schedule-resolve";
import { shopSchedulingFromRow } from "@/lib/shop-scheduling";
import { loadSchedulesForStaffIdsInRange } from "@/lib/shifts/staff-schedules-db";
import { buildStaffTodayStatusSummary } from "@/lib/staff-day-status";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodyFromCaught } from "@/lib/supabase/errors";

/** Staff today's punches at one shop (Malaysia calendar day). */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const shopId = String(url.searchParams.get("shop_id") ?? "").trim();
    const staffId = String(url.searchParams.get("staff_id") ?? "").trim();
    const staffIdentifier = String(url.searchParams.get("staff_identifier") ?? "").trim();
    const punchQrToken =
      normalizePunchQrToken(url.searchParams.get("punch_qr_token")) ??
      normalizePunchQrToken(url.searchParams.get("t"));

    if (!shopId) {
      return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
    }
    if (!staffId && !staffIdentifier) {
      return NextResponse.json(
        { error: "staff_id or staff_identifier is required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const dayYmd = malaysiaDateYmd(new Date());

    const [shopResult, staffResult] = await Promise.all([
      loadShopForPunch(supabase, shopId),
      validateStaffForPunch(supabase, shopId, {
        staffId: staffId || undefined,
        staffIdentifier: staffIdentifier || undefined,
      }),
    ]);

    if ("error" in shopResult) {
      return NextResponse.json({ error: shopResult.error }, { status: shopResult.status });
    }
    if ("error" in staffResult) {
      return NextResponse.json({ error: staffResult.error }, { status: staffResult.status });
    }

    const { shop } = shopResult;
    const { staff: staffRow } = staffResult;

    const qrCheck = validatePunchQrToken(shopId, shop.punchQrToken, punchQrToken);
    if (!qrCheck.ok) {
      return NextResponse.json({ error: qrCheck.error }, { status: 403 });
    }

    const allDayRows = await fetchAttendanceForDay(supabase, dayYmd, shopId);
    const rows = allDayRows.filter((r) => r.staff_id === staffRow.id);
    const summary = buildStaffTodayStatusSummary(rows, dayYmd);

    const { data: shopRow } = await supabase
      .from("shops")
      .select("work_time_mode, opening_time, closing_time, break_minutes")
      .eq("id", shopId)
      .maybeSingle();
    const shopScheduling = shopRow ? shopSchedulingFromRow(shopRow as Record<string, unknown>) : null;
    const explicitMap = await loadSchedulesForStaffIdsInRange(supabase, {
      staffIds: [staffRow.id],
      from: dayYmd,
      to: dayYmd,
    });
    const daySchedules = (explicitMap?.get(staffRow.id)?.get(dayYmd) ?? []).filter(
      (r) => r.status === "active" && r.shop_id === shopId,
    );
    const shiftMatch = matchStaffDayWithShopSchedule({
      ymd: dayYmd,
      shop: shopScheduling,
      explicitRow: daySchedules[0] ?? null,
      explicitRows: daySchedules,
      history: rows,
      shopIdFilter: shopId,
    });
    const openStatuses = new Set([
      "open_shift",
      "in_shift",
      "waiting_for_next_shift",
      "upcoming",
      "completed",
      "late",
      "early_leave",
      "on_time",
    ]);
    if (openStatuses.has(shiftMatch.status)) {
      summary.attendance_issues = {
        missing_clock_in: false,
        missing_clock_out: false,
        missing_punch: false,
        issue_labels: [],
      };
      if (summary.status === "missing_clock_out") {
        summary.status = rows.length === 0 ? "not_clocked_in" : "in_shop";
        summary.status_label =
          summary.status === "not_clocked_in" ? "Not clocked in" : "In shop";
      }
    }

    return NextResponse.json({
      staff_id: staffRow.id,
      staff_name: staffRow.staff_name,
      staff_code: staffRow.staff_code,
      shop_id: shopId,
      shop_name: shop.name,
      ...summary,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(bodyFromCaught(e), { status: 500 });
  }
}

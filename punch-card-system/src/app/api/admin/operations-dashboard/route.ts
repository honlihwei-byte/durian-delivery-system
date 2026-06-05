import { NextResponse } from "next/server";
import {
  analyzeDayIssues,
  analyzeDayIssuesWithShift,
  buildReportSummary,
  monthStatsFromRows,
} from "@/lib/attendance-report";
import { riskBadgesForRows } from "@/lib/attendance-risk-badges";
import {
  attendanceForTotals,
  daysInMonth,
  firstClockIn,
  formatDuration,
  lastClockOut,
  shopNamesVisited,
  sortByEventTime,
  staffHasPunchRows,
  totalWorkedMsForDay,
  type AttendanceRecord,
} from "@/lib/attendance";
import { fetchAttendanceForDay, fetchAttendanceInRange, recordEventTime } from "@/lib/attendance-db";
import {
  blockSuperAdminFromOps,
  isNextResponse,
  requireCompanyAdmin,
} from "@/lib/admin-api-auth";
import { companyFeatureAccess, getSubscriptionForCompany } from "@/lib/billing";
import { fetchCompanyById, shopIdsForCompany } from "@/lib/company-db";
import { malaysiaDateYmd } from "@/lib/malaysia-time";
import {
  computeShopHealthScore,
  gpsIssueCountFromIssues,
  staffNeedsReviewToday,
} from "@/lib/operations-dashboard";
import { attendanceReliability } from "@/lib/attendance-reliability";
import { matchStaffDayWithShopSchedule } from "@/lib/shop-schedule-resolve";
import { loadSchedulesForStaffIdsInRange, type StaffScheduleRow } from "@/lib/shifts/staff-schedules-db";
import { createAdminClient } from "@/lib/supabase/admin";

type StaffRow = {
  id: string;
  staff_name: string;
  staff_code: string;
};

function primaryShopIdFromDay(rows: AttendanceRecord[]): string | null {
  const counted = attendanceForTotals(rows);
  if (counted.length === 0) return null;
  return counted[0]!.shop_id ?? null;
}

export async function GET(req: Request) {
  const session = requireCompanyAdmin(req);
  if (isNextResponse(session)) return session;
  const opsBlock = blockSuperAdminFromOps(session);
  if (opsBlock) return opsBlock;

  const companyId = session.companyId!;

  try {
    const supabase = createAdminClient();
    const company = await fetchCompanyById(supabase, companyId);
    if (company) {
      const sub = await getSubscriptionForCompany(supabase, company);
      if (companyFeatureAccess(company, sub) !== "full") {
        return NextResponse.json(
          {
            error: "Subscription required.",
            code: "SUBSCRIPTION_REQUIRED",
            redirect: "/subscription-required",
          },
          { status: 402 },
        );
      }
    }

    const today = malaysiaDateYmd(new Date());
    const monthYmd = today.slice(0, 7);
    const [yStr, moRaw] = monthYmd.split("-");
    const moNum = Number(moRaw);
    const yNum = Number(yStr);
    const mo = String(moNum).padStart(2, "0");
    const dim = daysInMonth(yNum, moNum - 1);
    const monthStart = `${yStr}-${mo}-01`;
    const monthEnd = `${yStr}-${mo}-${String(dim).padStart(2, "0")}`;

    const companyShopIds = await shopIdsForCompany(supabase, companyId);
    if (companyShopIds.length === 0) {
      return NextResponse.json({
        date: today,
        month: monthYmd,
        risks: {
          late_count: 0,
          missing_clock_out_count: 0,
          gps_issues_count: 0,
          review_required_count: 0,
          photo_proof_pending_count: 0,
          new_device_count: 0,
        },
        shops: [],
        staff_attention: [],
        staff_reliable: [],
        live_attendance: [],
      });
    }

    const { data: shopRows } = await supabase
      .from("shops")
      .select("id, name")
      .in("id", companyShopIds)
      .order("name", { ascending: true });

    const shops = (shopRows ?? []).map((s) => ({
      id: String(s.id),
      name: String(s.name ?? "Shop"),
    }));

    const { data: staffData, error: staffErr } = await supabase
      .from("staff")
      .select("id, staff_name, staff_code")
      .eq("company_id", companyId)
      .eq("status", "active")
      .order("staff_name", { ascending: true });
    if (staffErr) throw new Error(staffErr.message);
    const staff = (staffData ?? []) as StaffRow[];
    const staffIds = staff.map((s) => s.id);

    const [dayPunches, monthPunches, explicitDay, explicitMonth] = await Promise.all([
      fetchAttendanceForDay(supabase, today, null, companyShopIds),
      staffIds.length > 0
        ? fetchAttendanceInRange(supabase, monthStart, monthEnd, null, companyShopIds)
        : Promise.resolve([]),
      staffIds.length > 0
        ? loadSchedulesForStaffIdsInRange(supabase, { staffIds, from: today, to: today })
        : Promise.resolve(new Map()),
      staffIds.length > 0
        ? loadSchedulesForStaffIdsInRange(supabase, {
            staffIds,
            from: monthStart,
            to: monthEnd,
          })
        : Promise.resolve(new Map()),
    ]);

    const byStaffDay = new Map<string, AttendanceRecord[]>();
    for (const p of dayPunches) {
      const arr = byStaffDay.get(p.staff_id) ?? [];
      arr.push(p);
      byStaffDay.set(p.staff_id, arr);
    }

    type DayStaff = {
      staff_id: string;
      staff_name: string;
      staff_code: string;
      shops_label: string;
      primary_shop_id: string | null;
      scheduled_label: string | null;
      first_in: string | null;
      last_out: string | null;
      attendance_status: string;
      late_minutes: number;
      issues: ReturnType<typeof analyzeDayIssues>;
      history: AttendanceRecord[];
      has_punch: boolean;
      total_hours_ms: number;
    };

    const dayStaffRows: DayStaff[] = [];

    for (const s of staff) {
      const dayRows = sortByEventTime(byStaffDay.get(s.id) ?? []);
      const hasPunch = staffHasPunchRows(dayRows);
      if (!hasPunch) continue;

      const daySchedules = (explicitDay.get(s.id)?.get(today) ?? []).filter(
        (r: StaffScheduleRow) => r.status === "active",
      );
      const explicit = daySchedules[0] ?? null;
      const matched = matchStaffDayWithShopSchedule({
        ymd: today,
        shop: null,
        explicitRow: explicit,
        explicitRows: daySchedules,
        history: dayRows,
        shopIdFilter: null,
      });
      const scheduledLabel =
        matched.scheduled_start && matched.scheduled_end
          ? `${matched.scheduled_start}–${matched.scheduled_end}`
          : explicit?.is_off_day
            ? "OFF"
            : null;
      const issues = analyzeDayIssuesWithShift(dayRows, matched.status);
      const fi = firstClockIn(dayRows);
      const lo = lastClockOut(dayRows);

      dayStaffRows.push({
        staff_id: s.id,
        staff_name: s.staff_name,
        staff_code: s.staff_code,
        shops_label: shopNamesVisited(dayRows),
        primary_shop_id: primaryShopIdFromDay(dayRows),
        scheduled_label: scheduledLabel,
        first_in: fi ? recordEventTime(fi) : null,
        last_out: lo ? recordEventTime(lo) : null,
        attendance_status: matched.status,
        late_minutes: matched.late_minutes ?? 0,
        issues,
        history: dayRows,
        has_punch: true,
        total_hours_ms: totalWorkedMsForDay(dayRows),
      });
    }

    const summary = buildReportSummary(dayStaffRows);

    let late_count = 0;
    let photo_proof_pending_count = 0;
    let new_device_count = 0;

    for (const row of dayStaffRows) {
      if (row.late_minutes > 0) late_count += 1;
      photo_proof_pending_count += row.issues.photo_proof_count;
      const risk = riskBadgesForRows(row.history);
      if (risk.includes("new_device")) new_device_count += 1;
    }

    const shopStats = new Map<
      string,
      {
        present: number;
        scheduled: Set<string>;
        late: number;
        missing_clock_out: number;
        gps_issues: number;
        review_required: number;
      }
    >();

    for (const shop of shops) {
      shopStats.set(shop.id, {
        present: 0,
        scheduled: new Set(),
        late: 0,
        missing_clock_out: 0,
        gps_issues: 0,
        review_required: 0,
      });
    }

    for (const s of staff) {
      const schedules = (explicitDay.get(s.id)?.get(today) ?? []).filter(
        (r: StaffScheduleRow) => r.status === "active" && !r.is_off_day,
      );
      for (const sched of schedules) {
        const bucket = shopStats.get(sched.shop_id);
        if (bucket) bucket.scheduled.add(s.id);
      }
    }

    for (const row of dayStaffRows) {
      const shopIds = new Set(
        attendanceForTotals(row.history)
          .map((r) => r.shop_id)
          .filter(Boolean),
      );
      for (const shopId of shopIds) {
        const bucket = shopStats.get(shopId);
        if (!bucket) continue;
        bucket.present += 1;
        if (row.late_minutes > 0) bucket.late += 1;
        if (row.issues.missing_clock_out) bucket.missing_clock_out += 1;
        bucket.gps_issues += gpsIssueCountFromIssues(row.issues);
        if (staffNeedsReviewToday(row.issues, row.history)) bucket.review_required += 1;
      }
    }

    const shopHealth = shops.map((shop) => {
      const bucket = shopStats.get(shop.id)!;
      const counts = {
        late: bucket.late,
        missing_clock_out: bucket.missing_clock_out,
        gps_issues: bucket.gps_issues,
        review_required: bucket.review_required,
      };
      return {
        shop_id: shop.id,
        shop_name: shop.name,
        present_count: bucket.present,
        scheduled_count: bucket.scheduled.size,
        late_count: bucket.late,
        missing_clock_out_count: bucket.missing_clock_out,
        gps_issues_count: bucket.gps_issues,
        review_required_count: bucket.review_required,
        health_score: computeShopHealthScore(counts),
      };
    });

    const staff_attention = dayStaffRows
      .filter(
        (row) =>
          row.late_minutes > 0 ||
          row.issues.missing_clock_out ||
          staffNeedsReviewToday(row.issues, row.history) ||
          gpsIssueCountFromIssues(row.issues) > 0,
      )
      .map((row) => {
        const reasons: string[] = [];
        if (row.late_minutes > 0) reasons.push("late");
        if (row.issues.missing_clock_out) reasons.push("missing_clock_out");
        if (gpsIssueCountFromIssues(row.issues) > 0) reasons.push("location");
        const risk = riskBadgesForRows(row.history);
        if (
          risk.includes("buddy_punch") ||
          risk.includes("high_risk") ||
          row.issues.badges.includes("suspicious_punch_sequence")
        ) {
          reasons.push("review");
        } else if (staffNeedsReviewToday(row.issues, row.history)) {
          reasons.push("review");
        }
        return {
          staff_id: row.staff_id,
          staff_name: row.staff_name,
          shop_label: row.shops_label,
          reasons,
        };
      })
      .slice(0, 12);

    const reliabilityRows = staff
      .map((s) => {
        const staffRows = monthPunches.filter((p) => p.staff_id === s.id);
        if (staffRows.length === 0) return null;
        const stats = monthStatsFromRows(staffRows, dim, monthYmd);
        const issues = analyzeDayIssues(sortByEventTime(staffRows));
        const rel = attendanceReliability({
          missing_clock_out_days: stats.missing_clock_out_days,
          rejected_gps_count: stats.rejected_gps_count,
          review_required_count: stats.review_required_count,
          issues,
          shift_performance: null,
        });
        return {
          staff_id: s.id,
          staff_name: s.staff_name,
          shop_label: shopNamesVisited(staffRows),
          reliability_score: rel.score,
          tier: rel.tier,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r != null);

    const staff_reliable = [...reliabilityRows]
      .sort((a, b) => b.reliability_score - a.reliability_score)
      .slice(0, 5);

    const attentionWithReliability = staff_attention.map((row) => {
      const rel = reliabilityRows.find((r) => r.staff_id === row.staff_id);
      return {
        ...row,
        reliability_score: rel?.reliability_score ?? null,
      };
    });

    const live_attendance = dayStaffRows.map((row) => ({
      staff_id: row.staff_id,
      staff_name: row.staff_name,
      shop_label: row.shops_label,
      scheduled_shift: row.scheduled_label,
      clock_in: row.first_in,
      clock_out: row.last_out,
      status: row.attendance_status,
      issue_badges: row.issues.badges,
      late_minutes: row.late_minutes,
    }));

    return NextResponse.json({
      date: today,
      month: monthYmd,
      risks: {
        late_count,
        missing_clock_out_count: summary.missing_clock_out_count,
        gps_issues_count: summary.gps_issues_count,
        review_required_count: summary.review_required_count,
        photo_proof_pending_count,
        new_device_count,
      },
      shops: shopHealth,
      staff_attention: attentionWithReliability,
      staff_reliable,
      live_attendance,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

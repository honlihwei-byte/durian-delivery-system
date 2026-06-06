import { NextResponse } from "next/server";
import { addDaysYmd, shopNamesVisited, type AttendanceRecord } from "@/lib/attendance";
import { fetchAttendanceForDay, fetchAttendanceInRange } from "@/lib/attendance-db";
import {
  blockSuperAdminFromOps,
  isNextResponse,
  requireCompanyAdmin,
} from "@/lib/admin-api-auth";
import { companyFeatureAccess, getSubscriptionForCompany } from "@/lib/billing";
import { fetchCompanyById, shopIdsForCompany } from "@/lib/company-db";
import { malaysiaDateYmd } from "@/lib/malaysia-time";
import {
  aggregateTodayRisks,
  buildDayStaffAttention,
  computeMostImprovedShops,
  computeShopHealthRows,
  computeStaffReliabilityRows,
  computeWorkloadInsights,
  type ShopTaskCounts,
} from "@/lib/operations-intelligence";
import {
  getRejectedProofCountsByStaff,
  getTaskShopStatsForDates,
} from "@/lib/retail-tasks/retail-tasks-db";
import { loadSchedulesForStaffIdsInRange, type StaffScheduleRow } from "@/lib/shifts/staff-schedules-db";
import { createAdminClient } from "@/lib/supabase/admin";

type StaffRow = {
  id: string;
  staff_name: string;
  staff_code: string;
};

function punchesForDay(all: AttendanceRecord[], ymd: string): AttendanceRecord[] {
  return all.filter((p) => p.event_date?.slice(0, 10) === ymd);
}

function taskMapForDay(
  taskByDate: Map<string, Map<string, ShopTaskCounts>>,
  ymd: string,
  shopIds: string[],
): Map<string, ShopTaskCounts> {
  const dayMap = taskByDate.get(ymd) ?? new Map<string, ShopTaskCounts>();
  const result = new Map<string, ShopTaskCounts>();
  for (const shopId of shopIds) {
    result.set(shopId, dayMap.get(shopId) ?? { task_count: 0, overdue: 0, exceptions: 0 });
  }
  return result;
}

const EMPTY_RESPONSE = {
  risks: {
    late_count: 0,
    missing_clock_out_count: 0,
    gps_issues_count: 0,
    review_required_count: 0,
    overdue_tasks_count: 0,
    task_exceptions_count: 0,
  },
  shops: [],
  staff_reliable: [],
  staff_needs_attention: [],
  most_improved: { has_enough_data: false, shops: [] },
  workload: { performing_well: [], needs_support: [] },
};

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
    const thirtyDaysAgo = addDaysYmd(today, -30);
    const fourteenDaysAgo = addDaysYmd(today, -13);

    const historicalDates: string[] = [];
    for (let i = 13; i >= 0; i--) {
      historicalDates.push(addDaysYmd(today, -i));
    }

    const companyShopIds = await shopIdsForCompany(supabase, companyId);
    if (companyShopIds.length === 0) {
      return NextResponse.json({
        date: today,
        summary: {
          average_shop_health: null,
          today_risks_total: 0,
          staff_needing_attention: 0,
          most_improved_shop_name: null,
        },
        ...EMPTY_RESPONSE,
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
    const shopNameById = new Map(shops.map((s) => [s.id, s.name]));

    const { data: staffData, error: staffErr } = await supabase
      .from("staff")
      .select("id, staff_name, staff_code")
      .eq("company_id", companyId)
      .eq("status", "active")
      .order("staff_name", { ascending: true });
    if (staffErr) throw new Error(staffErr.message);
    const staff = (staffData ?? []) as StaffRow[];
    const staffIds = staff.map((s) => s.id);

    const [dayPunches, rangePunches, schedulesRange, taskByDate, rejectedByStaff] =
      await Promise.all([
        fetchAttendanceForDay(supabase, today, null, companyShopIds),
        staffIds.length > 0
          ? fetchAttendanceInRange(supabase, fourteenDaysAgo, today, null, companyShopIds)
          : Promise.resolve([]),
        staffIds.length > 0
          ? loadSchedulesForStaffIdsInRange(supabase, {
              staffIds,
              from: fourteenDaysAgo,
              to: today,
            })
          : Promise.resolve(new Map<string, Map<string, StaffScheduleRow[]>>()),
        getTaskShopStatsForDates(supabase, companyId, historicalDates),
        getRejectedProofCountsByStaff(
          supabase,
          companyId,
          `${thirtyDaysAgo}T00:00:00+08:00`,
        ),
      ]);

    const todayTaskByShop = taskMapForDay(taskByDate, today, companyShopIds);
    const todayShopRows = computeShopHealthRows({
      shops,
      staff,
      dayYmd: today,
      punches: dayPunches,
      schedulesByStaffDay: schedulesRange,
      taskByShop: todayTaskByShop,
    });

    const risks = aggregateTodayRisks(
      staff,
      today,
      dayPunches,
      schedulesRange,
      todayShopRows,
    );

    const todayDayStaff = buildDayStaffAttention(
      staff,
      today,
      dayPunches,
      schedulesRange,
      shopNameById,
    );

    const reliabilityRows = computeStaffReliabilityRows({
      staff,
      punches: rangePunches.filter((p) => {
        const d = p.event_date?.slice(0, 10);
        return d != null && d >= thirtyDaysAgo && d <= today;
      }),
      schedulesByStaffDay: schedulesRange,
      rejectedProofsByStaff: rejectedByStaff,
      shopNamesFromPunches: shopNamesVisited,
    });

    const staff_reliable = [...reliabilityRows]
      .sort((a, b) => b.reliability_score - a.reliability_score)
      .slice(0, 5);

    const lowReliability = [...reliabilityRows]
      .filter((r) => r.reliability_score < 75)
      .sort((a, b) => a.reliability_score - b.reliability_score)
      .slice(0, 8);

    const staff_needs_attention =
      lowReliability.length > 0
        ? lowReliability.map((r) => ({
            staff_id: r.staff_id,
            staff_name: r.staff_name,
            shop_label: r.shop_label,
            reliability_score: r.reliability_score,
            today_reasons: todayDayStaff.find((a) => a.staff_id === r.staff_id)?.reasons ?? [],
          }))
        : todayDayStaff.slice(0, 8).map((row) => {
            const rel = reliabilityRows.find((r) => r.staff_id === row.staff_id);
            return {
              staff_id: row.staff_id,
              staff_name: row.staff_name,
              shop_label: row.shop_label,
              reliability_score: rel?.reliability_score ?? null,
              today_reasons: row.reasons,
            };
          });

    const dailyScoresByShop = new Map<string, number[]>();
    for (const ymd of historicalDates) {
      const dayPunchesForDate = punchesForDay(rangePunches, ymd);
      const taskMap = taskMapForDay(taskByDate, ymd, companyShopIds);
      const dayShops = computeShopHealthRows({
        shops,
        staff,
        dayYmd: ymd,
        punches: dayPunchesForDate,
        schedulesByStaffDay: schedulesRange,
        taskByShop: taskMap,
      });
      for (const row of dayShops) {
        const arr = dailyScoresByShop.get(row.shop_id) ?? [];
        arr.push(row.health_score);
        dailyScoresByShop.set(row.shop_id, arr);
      }
    }

    const mostImproved = computeMostImprovedShops(shops, dailyScoresByShop, 7, 7);
    const workload = computeWorkloadInsights(todayShopRows);

    const average_shop_health =
      todayShopRows.length > 0
        ? Math.round(
            todayShopRows.reduce((sum, s) => sum + s.health_score, 0) / todayShopRows.length,
          )
        : null;

    const today_risks_total =
      risks.late_count +
      risks.missing_clock_out_count +
      risks.gps_issues_count +
      risks.review_required_count +
      risks.overdue_tasks_count +
      risks.task_exceptions_count;

    return NextResponse.json({
      date: today,
      summary: {
        average_shop_health,
        today_risks_total,
        staff_needing_attention: staff_needs_attention.length,
        most_improved_shop_name: mostImproved.shops[0]?.shop_name ?? null,
      },
      risks,
      shops: todayShopRows.map((s) => ({
        shop_id: s.shop_id,
        shop_name: s.shop_name,
        present_count: s.present_count,
        scheduled_count: s.scheduled_count,
        health_score: s.health_score,
        status: s.status,
        reasons: s.reasons,
        task_count_today: s.task_count_today,
      })),
      staff_reliable,
      staff_needs_attention,
      most_improved: {
        has_enough_data: mostImproved.hasEnoughData,
        shops: mostImproved.shops,
      },
      workload,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}

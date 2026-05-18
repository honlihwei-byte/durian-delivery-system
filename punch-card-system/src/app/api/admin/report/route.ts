import { NextResponse } from "next/server";
import {
  fetchAttendanceForDay,
  fetchAttendanceInRange,
  matchesEventDate,
  recordEventDate,
  recordEventTime,
} from "@/lib/attendance-db";
import {
  addDaysYmd,
  attendanceForTotals,
  daysInMonth,
  firstClockIn,
  formatDuration,
  lastClockOut,
  punchIssueForDay,
  type AttendanceRecord,
  shopNamesVisited,
  sortByCreatedAt,
  staffHasPunchRows,
  totalWorkedMsForDay,
  weekRangeMondayStart,
} from "@/lib/attendance";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReportView = "attendance" | "absent";

function shopFilterId(url: URL): string | null {
  const v = url.searchParams.get("shop_id");
  if (!v || v === "__all__") return null;
  return v;
}

function parseReportView(url: URL): ReportView {
  const v = url.searchParams.get("view");
  return v === "absent" ? "absent" : "attendance";
}

function parseIncludeInactive(url: URL): boolean {
  return url.searchParams.get("include_inactive") === "true";
}

type StaffRow = {
  id: string;
  staff_name: string;
  staff_code: string;
  staff_type: string;
  status: string;
};

async function loadStaff(
  supabase: ReturnType<typeof createAdminClient>,
  filters: {
    staffId: string | null;
    staffType: string | null;
    shopId: string | null;
    includeInactive: boolean;
  },
): Promise<StaffRow[]> {
  let staffIdsFilter: string[] | null = null;
  if (filters.shopId) {
    const { data: links, error: linkErr } = await supabase
      .from("staff_shop_assignments")
      .select("staff_id")
      .eq("shop_id", filters.shopId);
    if (linkErr) throw new Error(linkErr.message);
    staffIdsFilter = [...new Set((links ?? []).map((r) => r.staff_id as string))];
    if (staffIdsFilter.length === 0) return [];
  }

  let q = supabase
    .from("staff")
    .select("id, staff_name, staff_code, staff_type, status")
    .order("staff_name", { ascending: true });
  if (filters.staffId) q = q.eq("id", filters.staffId);
  if (filters.staffType) q = q.eq("staff_type", filters.staffType);
  if (staffIdsFilter) q = q.in("id", staffIdsFilter);
  if (!filters.includeInactive) q = q.eq("status", "active");
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as StaffRow[];
}

async function latestStatusGlobal(
  supabase: ReturnType<typeof createAdminClient>,
  staffIds: string[],
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  if (staffIds.length === 0) return map;
  const { data, error } = await supabase
    .from("attendance")
    .select("staff_id, action_type, created_at, gps_verified, staff_latitude, staff_longitude")
    .in("staff_id", staffIds)
    .order("created_at", { ascending: false })
    .limit(12000);
  if (error) {
    console.error(error);
    return map;
  }
  for (const row of data ?? []) {
    if (map.has(row.staff_id)) continue;
    const legacy = row.staff_latitude == null && row.staff_longitude == null;
    if (!legacy && row.gps_verified !== true) continue;
    map.set(row.staff_id, row.action_type === "clock_in");
  }
  return map;
}

function staffPassesView(hasPunch: boolean, view: ReportView): boolean {
  return view === "attendance" ? hasPunch : !hasPunch;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode");
  const shopIdFilter = shopFilterId(url);
  const staffIdFilter = url.searchParams.get("staff_id");
  const staffTypeFilter = url.searchParams.get("staff_type");
  const view = parseReportView(url);
  const includeInactive = parseIncludeInactive(url);

  if (!mode || (mode !== "day" && mode !== "week" && mode !== "month" && mode !== "range")) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const staff = await loadStaff(supabase, {
      staffId: staffIdFilter || null,
      staffType: staffTypeFilter || null,
      shopId: shopIdFilter,
      includeInactive,
    });

    const staffIds = staff.map((s) => s.id);
    const latest = await latestStatusGlobal(supabase, staffIds);

    if (mode === "day") {
      const date = url.searchParams.get("date");
      if (!date) {
        return NextResponse.json({ error: "date is required" }, { status: 400 });
      }

      const rows = await fetchAttendanceForDay(supabase, date, shopIdFilter);
      const byStaff = new Map<string, AttendanceRecord[]>();
      for (const p of rows) {
        const arr = byStaff.get(p.staff_id) ?? [];
        arr.push(p);
        byStaff.set(p.staff_id, arr);
      }

      const staffRows = staff
        .map((s) => {
          const dayRows = byStaff.get(s.id) ?? [];
          const hasPunch = staffHasPunchRows(dayRows);
          const countedRows = attendanceForTotals(dayRows);
          const fi = firstClockIn(dayRows);
          const lo = lastClockOut(dayRows);
          const hoursMs = totalWorkedMsForDay(dayRows);
          return {
            staff_id: s.id,
            staff_name: s.staff_name,
            staff_code: s.staff_code,
            staff_type: s.staff_type,
            staff_status: s.status,
            shops_label: shopNamesVisited(dayRows),
            has_punch: hasPunch,
            first_in: fi ? recordEventTime(fi) : null,
            last_out: lo ? recordEventTime(lo) : null,
            total_hours_ms: hoursMs,
            total_hours_label: formatDuration(hoursMs),
            current_in_shop: latest.get(s.id) ?? false,
            punch_issue: hasPunch ? punchIssueForDay(dayRows) : null,
            history: sortByCreatedAt(dayRows),
            punch_count: countedRows.length,
          };
        })
        .filter((row) => staffPassesView(row.has_punch, view));

      return NextResponse.json({
        mode,
        view,
        date,
        shop_id: shopIdFilter,
        include_inactive: includeInactive,
        staffRows,
      });
    }

    if (mode === "range") {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const dateRe = /^\d{4}-\d{2}-\d{2}$/;
      if (!from || !to || !dateRe.test(from) || !dateRe.test(to) || from > to) {
        return NextResponse.json({ error: "from and to dates required (YYYY-MM-DD)" }, { status: 400 });
      }

      const punches = await fetchAttendanceInRange(supabase, from, to, shopIdFilter);

      const days: string[] = [];
      let d = from;
      while (d <= to && days.length < 93) {
        days.push(d);
        d = addDaysYmd(d, 1);
      }

      const rows = staff
        .map((s) => {
          const staffPunches = punches.filter((p) => p.staff_id === s.id);
          let total_hours_ms = 0;
          let present_days = 0;
          const daily: Record<string, { present: boolean; hours_label: string; punch_issue: string | null }> =
            {};
          for (const day of days) {
            const dayRows = staffPunches.filter((p) => matchesEventDate(p, day));
            const present = staffHasPunchRows(dayRows);
            const hoursMs = totalWorkedMsForDay(dayRows);
            daily[day] = {
              present,
              hours_label: formatDuration(hoursMs),
              punch_issue: present ? punchIssueForDay(dayRows) : null,
            };
            if (present) present_days += 1;
            total_hours_ms += hoursMs;
          }
          const hasPunch = present_days > 0;
          return {
            staff_id: s.id,
            staff_name: s.staff_name,
            staff_code: s.staff_code,
            staff_type: s.staff_type,
            staff_status: s.status,
            shops_label: shopNamesVisited(staffPunches),
            has_punch: hasPunch,
            present_days,
            no_punch_days: Math.max(0, days.length - present_days),
            total_hours_ms,
            total_hours_label: formatDuration(total_hours_ms),
            daily,
            history: sortByCreatedAt(staffPunches),
          };
        })
        .filter((row) => staffPassesView(row.has_punch, view));

      return NextResponse.json({
        mode,
        view,
        shop_id: shopIdFilter,
        include_inactive: includeInactive,
        from,
        to,
        days,
        rows,
      });
    }

    if (mode === "week") {
      const weekStart = url.searchParams.get("week_start");
      if (!weekStart) {
        return NextResponse.json({ error: "week_start is required" }, { status: 400 });
      }
      const days = weekRangeMondayStart(weekStart);
      const rangeEnd = days[6];

      const punches = await fetchAttendanceInRange(supabase, weekStart, rangeEnd, shopIdFilter);

      const reportRows = staff
        .map((s) => {
          const staffPunches = punches.filter((p) => p.staff_id === s.id);
          const daily: Record<string, { present: boolean; hours_label: string; punch_issue: string | null }> =
            {};
          let total_present_days = 0;
          let total_hours_ms = 0;
          for (const day of days) {
            const dayRows = staffPunches.filter((p) => matchesEventDate(p, day));
            const present = staffHasPunchRows(dayRows);
            const hoursMs = totalWorkedMsForDay(dayRows);
            daily[day] = {
              present,
              hours_label: formatDuration(hoursMs),
              punch_issue: present ? punchIssueForDay(dayRows) : null,
            };
            if (present) total_present_days += 1;
            total_hours_ms += hoursMs;
          }
          return {
            staff_id: s.id,
            staff_name: s.staff_name,
            staff_code: s.staff_code,
            staff_type: s.staff_type,
            staff_status: s.status,
            shops_label: shopNamesVisited(staffPunches),
            has_punch: total_present_days > 0,
            daily,
            total_present_days,
            no_punch_days: Math.max(0, days.length - total_present_days),
            total_hours_ms,
            total_hours_label: formatDuration(total_hours_ms),
            history: sortByCreatedAt(staffPunches),
          };
        })
        .filter((row) => staffPassesView(row.has_punch, view));

      return NextResponse.json({
        mode,
        view,
        shop_id: shopIdFilter,
        include_inactive: includeInactive,
        week_start: weekStart,
        days,
        rows: reportRows,
      });
    }

    const monthRaw = url.searchParams.get("month");
    if (!monthRaw) {
      return NextResponse.json({ error: "month is required" }, { status: 400 });
    }
    const [yStr, moRaw] = monthRaw.split("-");
    const moNum = Number(moRaw);
    const yNum = Number(yStr);
    if (!yStr || !moRaw || !yNum || !moNum || moNum < 1 || moNum > 12) {
      return NextResponse.json({ error: "invalid month" }, { status: 400 });
    }
    const mo = String(moNum).padStart(2, "0");
    const m0 = moNum - 1;
    const dim = daysInMonth(yNum, m0);
    const start = `${yStr}-${mo}-01`;
    const end = `${yStr}-${mo}-${String(dim).padStart(2, "0")}`;

    const punches = await fetchAttendanceInRange(supabase, start, end, shopIdFilter);

    const monthRows = staff
      .map((s) => {
        const staffRows = punches.filter((p) => p.staff_id === s.id);
        const dates = new Set(attendanceForTotals(staffRows).map((p) => recordEventDate(p)));
        const present_days = dates.size;
        let total_hours_ms = 0;
        for (let day = 1; day <= dim; day++) {
          const ymd = `${yStr}-${mo}-${String(day).padStart(2, "0")}`;
          const dayRows = staffRows.filter((p) => matchesEventDate(p, ymd));
          total_hours_ms += totalWorkedMsForDay(dayRows);
        }
        return {
          staff_id: s.id,
          staff_name: s.staff_name,
          staff_code: s.staff_code,
          staff_type: s.staff_type,
          staff_status: s.status,
          shops_label: shopNamesVisited(staffRows),
          has_punch: present_days > 0,
          present_days,
          no_punch_days: Math.max(0, dim - present_days),
          total_hours_ms,
          total_hours_label: formatDuration(total_hours_ms),
          history: sortByCreatedAt(staffRows),
        };
      })
      .filter((row) => staffPassesView(row.has_punch, view));

    return NextResponse.json({
      mode,
      view,
      shop_id: shopIdFilter,
      include_inactive: includeInactive,
      month: `${yStr}-${mo}`,
      days_in_month: dim,
      rows: monthRows,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

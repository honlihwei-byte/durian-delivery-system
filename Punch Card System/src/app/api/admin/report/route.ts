import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  totalWorkedMsForDay,
  weekRangeMondayStart,
} from "@/lib/attendance";

function shopFilterId(url: URL): string | null {
  const v = url.searchParams.get("shop_id");
  if (!v || v === "__all__") return null;
  return v;
}

async function loadStaff(
  supabase: ReturnType<typeof createAdminClient>,
  filters: { staffId: string | null; staffType: string | null; shopId: string | null },
) {
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
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode");
  const shopIdFilter = shopFilterId(url);
  const staffIdFilter = url.searchParams.get("staff_id");
  const staffTypeFilter = url.searchParams.get("staff_type");

  if (!mode || (mode !== "day" && mode !== "week" && mode !== "month" && mode !== "range")) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const staff = await loadStaff(supabase, {
      staffId: staffIdFilter || null,
      staffType: staffTypeFilter || null,
      shopId: shopIdFilter,
    });

    const staffIds = staff.map((s) => s.id);
    const latest = await latestStatusGlobal(supabase, staffIds);

    if (mode === "day") {
      const date = url.searchParams.get("date");
      if (!date) {
        return NextResponse.json({ error: "date is required" }, { status: 400 });
      }

      let q = supabase
        .from("attendance")
        .select("*")
        .eq("event_date", date)
        .order("created_at", { ascending: true });
      if (shopIdFilter) q = q.eq("shop_id", shopIdFilter);
      const { data: logs, error } = await q;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const rows = (logs ?? []) as AttendanceRecord[];
      const byStaff = new Map<string, AttendanceRecord[]>();
      for (const p of rows) {
        const arr = byStaff.get(p.staff_id) ?? [];
        arr.push(p);
        byStaff.set(p.staff_id, arr);
      }

      const staffRows = staff.map((s) => {
        const dayRows = byStaff.get(s.id) ?? [];
        const countedRows = attendanceForTotals(dayRows);
        const present = countedRows.length > 0;
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
          absent: !present,
          present,
          first_in: fi ? fi.event_time : null,
          last_out: lo ? lo.event_time : null,
          total_hours_ms: hoursMs,
          total_hours_label: formatDuration(hoursMs),
          current_in_shop: latest.get(s.id) ?? false,
          punch_issue: punchIssueForDay(dayRows),
          history: sortByCreatedAt(dayRows),
        };
      });

      return NextResponse.json({ mode, date, shop_id: shopIdFilter, staffRows });
    }

    if (mode === "range") {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const dateRe = /^\d{4}-\d{2}-\d{2}$/;
      if (!from || !to || !dateRe.test(from) || !dateRe.test(to) || from > to) {
        return NextResponse.json({ error: "from and to dates required (YYYY-MM-DD)" }, { status: 400 });
      }

      let q = supabase
        .from("attendance")
        .select("*")
        .gte("event_date", from)
        .lte("event_date", to)
        .order("created_at", { ascending: true });
      if (shopIdFilter) q = q.eq("shop_id", shopIdFilter);
      const { data: logs, error } = await q;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const punches = (logs ?? []) as AttendanceRecord[];

      const days: string[] = [];
      let d = from;
      while (d <= to && days.length < 93) {
        days.push(d);
        d = addDaysYmd(d, 1);
      }

      const rows = staff.map((s) => {
        const staffPunches = punches.filter((p) => p.staff_id === s.id);
        let total_hours_ms = 0;
        let present_days = 0;
        const daily: Record<string, { present: boolean; hours_label: string; punch_issue: string | null }> = {};
        for (const d of days) {
          const dayRows = staffPunches.filter((p) => p.event_date === d);
          const present = attendanceForTotals(dayRows).length > 0;
          const hoursMs = totalWorkedMsForDay(dayRows);
          daily[d] = {
            present,
            hours_label: formatDuration(hoursMs),
            punch_issue: punchIssueForDay(dayRows),
          };
          if (present) present_days += 1;
          total_hours_ms += hoursMs;
        }
        return {
          staff_id: s.id,
          staff_name: s.staff_name,
          staff_code: s.staff_code,
          staff_type: s.staff_type,
          staff_status: s.status,
          shops_label: shopNamesVisited(staffPunches),
          present_days,
          absent_days: Math.max(0, days.length - present_days),
          total_hours_ms,
          total_hours_label: formatDuration(total_hours_ms),
          daily,
          history: sortByCreatedAt(staffPunches),
        };
      });

      return NextResponse.json({
        mode,
        shop_id: shopIdFilter,
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

      let q = supabase
        .from("attendance")
        .select("*")
        .gte("event_date", weekStart)
        .lte("event_date", rangeEnd)
        .order("created_at", { ascending: true });
      if (shopIdFilter) q = q.eq("shop_id", shopIdFilter);
      const { data: logs, error } = await q;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const punches = (logs ?? []) as AttendanceRecord[];

      const reportRows = staff.map((s) => {
        const daily: Record<string, { present: boolean; hours_label: string }> = {};
        let total_present_days = 0;
        let total_hours_ms = 0;
        for (const d of days) {
          const dayRows = punches.filter((p) => p.staff_id === s.id && p.event_date === d);
          const present = attendanceForTotals(dayRows).length > 0;
          const hoursMs = totalWorkedMsForDay(dayRows);
          daily[d] = {
            present,
            hours_label: formatDuration(hoursMs),
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
          daily,
          total_present_days,
          total_hours_ms,
          total_hours_label: formatDuration(total_hours_ms),
        };
      });

      return NextResponse.json({
        mode,
        shop_id: shopIdFilter,
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

    let q = supabase
      .from("attendance")
      .select("*")
      .gte("event_date", start)
      .lte("event_date", end)
      .order("created_at", { ascending: true });
    if (shopIdFilter) q = q.eq("shop_id", shopIdFilter);
    const { data: logs, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const punches = (logs ?? []) as AttendanceRecord[];

    const monthRows = staff.map((s) => {
      const staffRows = punches.filter((p) => p.staff_id === s.id);
      const dates = new Set(attendanceForTotals(staffRows).map((p) => p.event_date));
      const present_days = dates.size;
      const absent_days = Math.max(0, dim - present_days);
      let total_hours_ms = 0;
      for (let day = 1; day <= dim; day++) {
        const ymd = `${yStr}-${mo}-${String(day).padStart(2, "0")}`;
        const dayRows = staffRows.filter((p) => p.event_date === ymd);
        total_hours_ms += totalWorkedMsForDay(dayRows);
      }
      return {
        staff_id: s.id,
        staff_name: s.staff_name,
        staff_code: s.staff_code,
        staff_type: s.staff_type,
        staff_status: s.status,
        present_days,
        absent_days,
        total_hours_ms,
        total_hours_label: formatDuration(total_hours_ms),
      };
    });

    return NextResponse.json({
      mode,
      shop_id: shopIdFilter,
      month: `${yStr}-${mo}`,
      days_in_month: dim,
      rows: monthRows,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

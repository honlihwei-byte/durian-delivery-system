"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  formatGpsDistanceMeters,
  gpsStatusLabel,
  mondayOfWeekContaining,
  type AttendanceRecord,
} from "@/lib/attendance";
import { recordEventDate, recordEventTime } from "@/lib/attendance-db";
import { formatMalaysiaRecordedAt } from "@/lib/malaysia-time";

type Shop = { id: string; name: string };
type Staff = { id: string; staff_name: string; status?: string };

function labelStaff(name: string, status?: string) {
  if (status === "inactive") return `${name} (inactive)`;
  return name;
}

function shopTitle(shops: Shop[], shopId: string): string {
  if (!shopId || shopId === "__all__") return "All shops";
  return shops.find((s) => s.id === shopId)?.name ?? "Shop";
}

type ReportView = "attendance" | "absent";

type DayStaffRow = {
  staff_id: string;
  staff_name: string;
  staff_code: string;
  staff_type: string;
  staff_status?: string;
  shops_label: string;
  first_in: string | null;
  last_out: string | null;
  total_hours_label: string;
  current_in_shop: boolean;
  punch_issue: string | null;
  history: AttendanceRecord[];
  punch_count?: number;
};

type RangeRow = {
  staff_id: string;
  staff_name: string;
  staff_code: string;
  staff_type: string;
  staff_status?: string;
  shops_label: string;
  present_days: number;
  no_punch_days: number;
  total_hours_label: string;
  history: AttendanceRecord[];
};

type WeekRow = {
  staff_id: string;
  staff_name: string;
  staff_code: string;
  staff_type: string;
  staff_status?: string;
  daily: Record<string, { present: boolean; hours_label: string }>;
  total_present_days: number;
  total_hours_label: string;
};

type MonthRow = {
  staff_id: string;
  staff_name: string;
  staff_code: string;
  staff_type: string;
  staff_status?: string;
  present_days: number;
  no_punch_days: number;
  total_hours_label: string;
};

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function AdminDashboard() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shopId, setShopId] = useState<string>("__all__");
  const [staffFilterId, setStaffFilterId] = useState("");
  const [staffTypeFilter, setStaffTypeFilter] = useState<string>("");
  const [mode, setMode] = useState<"day" | "week" | "month" | "range">("day");
  const [dayDate, setDayDate] = useState(todayYmd);
  const [rangeFrom, setRangeFrom] = useState(todayYmd);
  const [rangeTo, setRangeTo] = useState(todayYmd);
  const [weekAnchor, setWeekAnchor] = useState(todayYmd);
  const [monthValue, setMonthValue] = useState(currentMonthValue);
  const [monthStaffId, setMonthStaffId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dayData, setDayData] = useState<{
    date: string;
    shop_id: string | null;
    staffRows: DayStaffRow[];
  } | null>(null);
  const [weekData, setWeekData] = useState<{
    shop_id: string | null;
    week_start: string;
    days: string[];
    rows: WeekRow[];
  } | null>(null);
  const [monthData, setMonthData] = useState<{
    shop_id: string | null;
    month: string;
    days_in_month: number;
    rows: MonthRow[];
  } | null>(null);
  const [rangeData, setRangeData] = useState<{
    shop_id: string | null;
    from: string;
    to: string;
    rows: RangeRow[];
  } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reportView, setReportView] = useState<ReportView>("attendance");
  const [showInactive, setShowInactive] = useState(false);

  const weekStart = useMemo(() => mondayOfWeekContaining(weekAnchor), [weekAnchor]);

  const staffForFilter = useMemo(
    () => (showInactive ? staff : staff.filter((s) => s.status !== "inactive")),
    [staff, showInactive],
  );

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/shops");
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Failed to load shops");
        setShops((j.shops ?? []) as Shop[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load shops");
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/staff");
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Failed to load staff");
        setStaff((j.staff ?? []) as Staff[]);
      } catch {
        setStaff([]);
      }
    })();
  }, []);

  const reportStaffId = mode === "month" ? monthStaffId : staffFilterId;

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const shopQs = shopId && shopId !== "__all__" ? shopId : "__all__";
      const typeQs = staffTypeFilter || "";
      const viewQs = reportView;
      const inactiveQs = showInactive ? "true" : "false";

      if (mode === "day") {
        const qs = new URLSearchParams({
          mode: "day",
          date: dayDate,
          shop_id: shopQs,
          view: viewQs,
          include_inactive: inactiveQs,
        });
        if (reportStaffId) qs.set("staff_id", reportStaffId);
        if (typeQs) qs.set("staff_type", typeQs);
        const res = await fetch(`/api/admin/report?${qs}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Failed to load report");
        setDayData({ date: j.date, shop_id: j.shop_id, staffRows: j.staffRows });
        setWeekData(null);
        setMonthData(null);
        setRangeData(null);
      } else if (mode === "range") {
        const qs = new URLSearchParams({
          mode: "range",
          from: rangeFrom,
          to: rangeTo,
          shop_id: shopQs,
          view: viewQs,
          include_inactive: inactiveQs,
        });
        if (reportStaffId) qs.set("staff_id", reportStaffId);
        if (typeQs) qs.set("staff_type", typeQs);
        const res = await fetch(`/api/admin/report?${qs}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Failed to load report");
        setRangeData({
          shop_id: j.shop_id,
          from: j.from,
          to: j.to,
          rows: j.rows,
        });
        setDayData(null);
        setWeekData(null);
        setMonthData(null);
      } else if (mode === "week") {
        const qs = new URLSearchParams({
          mode: "week",
          shop_id: shopQs,
          week_start: weekStart,
          view: viewQs,
          include_inactive: inactiveQs,
        });
        if (reportStaffId) qs.set("staff_id", reportStaffId);
        if (typeQs) qs.set("staff_type", typeQs);
        const res = await fetch(`/api/admin/report?${qs}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Failed to load report");
        setWeekData({
          shop_id: j.shop_id,
          week_start: j.week_start,
          days: j.days,
          rows: j.rows,
        });
        setDayData(null);
        setMonthData(null);
        setRangeData(null);
      } else {
        const qs = new URLSearchParams({
          mode: "month",
          shop_id: shopQs,
          month: monthValue,
          view: viewQs,
          include_inactive: inactiveQs,
        });
        if (reportStaffId) qs.set("staff_id", reportStaffId);
        if (typeQs) qs.set("staff_type", typeQs);
        const res = await fetch(`/api/admin/report?${qs}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Failed to load report");
        setMonthData({
          shop_id: j.shop_id,
          month: j.month,
          days_in_month: j.days_in_month,
          rows: j.rows,
        });
        setDayData(null);
        setWeekData(null);
        setRangeData(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [
    shopId,
    mode,
    dayDate,
    rangeFrom,
    rangeTo,
    weekStart,
    monthValue,
    reportStaffId,
    staffTypeFilter,
    reportView,
    showInactive,
  ]);

  useEffect(() => {
    const t = window.setTimeout(() => void fetchReport(), 0);
    return () => window.clearTimeout(t);
  }, [fetchReport]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Attendance</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Filter by shop, staff, and type. Add shops and employees under{" "}
            <Link href="/admin/shops" className="font-medium text-blue-600 underline dark:text-blue-400">
              Shops
            </Link>{" "}
            and{" "}
            <Link href="/admin/staff" className="font-medium text-blue-600 underline dark:text-blue-400">
              Staff
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/shops"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-600 dark:text-zinc-100"
          >
            Shops
          </Link>
          <Link
            href="/admin/staff"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-600 dark:text-zinc-100"
          >
            Staff
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Report:</span>
        <button
          type="button"
          onClick={() => setReportView("attendance")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            reportView === "attendance"
              ? "bg-emerald-600 text-white"
              : "border border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900"
          }`}
        >
          Attendance
        </button>
        <button
          type="button"
          onClick={() => setReportView("absent")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            reportView === "absent"
              ? "bg-amber-600 text-white"
              : "border border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900"
          }`}
        >
          Absent report
        </button>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Shop
          <select
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
          >
            <option value="__all__">All shops</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[160px] flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Staff type
          <select
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            value={staffTypeFilter}
            onChange={(e) => setStaffTypeFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="full_time">Full time</option>
            <option value="part_time">Part time</option>
          </select>
        </label>

        {mode !== "month" ? (
          <label className="flex min-w-[200px] flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Staff
            <select
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
              value={staffFilterId}
              onChange={(e) => setStaffFilterId(e.target.value)}
            >
              <option value="">All staff</option>
              {staffForFilter.map((s) => (
                <option key={s.id} value={s.id}>
                  {labelStaff(s.staff_name, s.status)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-zinc-300"
          />
          Show inactive staff
        </label>

        <div className="flex flex-wrap gap-2">
          {(["day", "week", "month", "range"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
                mode === m
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {mode === "day" ? (
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Date
            <input
              type="date"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
              value={dayDate}
              onChange={(e) => setDayDate(e.target.value)}
            />
          </label>
        ) : null}

        {mode === "range" ? (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              From
              <input
                type="date"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              To
              <input
                type="date"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
              />
            </label>
          </>
        ) : null}

        {mode === "week" ? (
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Week (any day)
            <input
              type="date"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
              value={weekAnchor}
              onChange={(e) => setWeekAnchor(e.target.value)}
            />
          </label>
        ) : null}

        {mode === "month" ? (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Month
              <input
                type="month"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
                value={monthValue}
                onChange={(e) => setMonthValue(e.target.value)}
              />
            </label>
            <label className="flex min-w-[180px] flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Staff
              <select
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
                value={monthStaffId}
                onChange={(e) => setMonthStaffId(e.target.value)}
              >
                <option value="">All staff</option>
                {staffForFilter.map((s) => (
                  <option key={s.id} value={s.id}>
                    {labelStaff(s.staff_name, s.status)}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => void fetchReport()}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </section>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {mode === "day" && dayData ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {reportView === "absent" ? "Absent report" : "Attendance"} — {shopTitle(shops, shopId)} —{" "}
            {dayData.date}
          </h2>
          {dayData.staffRows.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
              {reportView === "absent"
                ? "No absent staff for this date with the current filters."
                : "No punches on this date for the current filters."}
            </p>
          ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-[960px] w-full border-collapse text-left text-sm">
              <thead className="bg-zinc-100 dark:bg-zinc-900">
                <tr>
                  <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">Staff</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">Type</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">Shop(s)</th>
                  {reportView === "absent" ? (
                    <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">Status</th>
                  ) : (
                    <>
                  <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">First in</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">Last out</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">Hours</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">Issues</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">Now</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">History</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {dayData.staffRows.map((row) => (
                  <Fragment key={row.staff_id}>
                    <tr className="odd:bg-white even:bg-zinc-50 dark:odd:bg-zinc-950 dark:even:bg-zinc-900/60">
                      <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                        {labelStaff(row.staff_name, row.staff_status)}
                        <div className="text-xs text-zinc-500">{row.staff_code}</div>
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                        {row.staff_type === "part_time" ? "Part time" : "Full time"}
                      </td>
                      <td className="max-w-[200px] border-b border-zinc-100 px-3 py-2 text-xs dark:border-zinc-800">
                        {reportView === "absent" ? "—" : row.shops_label}
                      </td>
                      {reportView === "absent" ? (
                        <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                          <span className="text-amber-700 dark:text-amber-300">Absent</span>
                        </td>
                      ) : (
                        <>
                      <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                        {row.first_in ?? "—"}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                        {row.last_out ?? "—"}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">{row.total_hours_label}</td>
                      <td className="border-b border-zinc-100 px-3 py-2 text-xs dark:border-zinc-800">
                        {row.punch_issue ? (
                          <span className="text-amber-700 dark:text-amber-300">{row.punch_issue}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                        {row.current_in_shop ? (
                          <span className="font-medium text-emerald-700 dark:text-emerald-300">In shop</span>
                        ) : (
                          <span className="text-zinc-600 dark:text-zinc-400">Out</span>
                        )}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                        <button
                          type="button"
                          className="text-blue-600 underline dark:text-blue-400"
                          onClick={() =>
                            setExpanded((v) => (v === row.staff_id ? null : row.staff_id))
                          }
                        >
                          {expanded === row.staff_id ? "Hide" : "Show"}
                        </button>
                      </td>
                        </>
                      )}
                    </tr>
                    {reportView === "attendance" && expanded === row.staff_id ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="border-b border-zinc-100 bg-zinc-50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/80"
                        >
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                            Log on {dayData.date}
                          </p>
                          {row.history.length === 0 ? (
                            <p className="text-sm text-zinc-600">No records.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[640px] text-xs">
                                <thead>
                                  <tr className="text-left text-zinc-500">
                                    <th className="py-1 pr-2">Time</th>
                                    <th className="py-1 pr-2">Shop</th>
                                    <th className="py-1 pr-2">Action</th>
                                    <th className="py-1 pr-2">GPS distance</th>
                                    <th className="py-1 pr-2">GPS status</th>
                                    <th className="py-1">Recorded</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.history.map((h) => {
                                    const gpsStatus = gpsStatusLabel(h);
                                    return (
                                      <tr key={h.id}>
                                        <td className="py-1 pr-2">{recordEventTime(h)}</td>
                                        <td className="py-1 pr-2">{h.shop_name}</td>
                                        <td className="py-1 pr-2">
                                          {h.action_type === "clock_in" ? "In" : "Out"}
                                        </td>
                                        <td className="py-1 pr-2">
                                          {formatGpsDistanceMeters(h.distance_from_shop_meters)}
                                        </td>
                                        <td className="py-1 pr-2">
                                          <span
                                            className={
                                              gpsStatus === "Verified"
                                                ? "text-emerald-700 dark:text-emerald-300"
                                                : gpsStatus === "Rejected"
                                                  ? "text-red-700 dark:text-red-300"
                                                  : "text-zinc-500"
                                            }
                                          >
                                            {gpsStatus}
                                          </span>
                                        </td>
                                        <td className="py-1 text-zinc-500">
                                          {formatMalaysiaRecordedAt(h.created_at)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          )}
          <p className="text-xs text-zinc-500">
            {reportView === "absent"
              ? "Absent = active staff in scope with no clock in/out on this date. Use Attendance tab for punch logs."
              : "Only staff with at least one punch on this date. Times are Malaysia (UTC+8). “Missing clock out” applies only after a clock-in. “In shop” is from the latest clock action."}
          </p>
        </section>
      ) : null}

      {mode === "range" && rangeData ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {reportView === "absent" ? "Absent report" : "Attendance"} — {shopTitle(shops, shopId)} —{" "}
            {rangeData.from} to {rangeData.to}
          </h2>
          {rangeData.rows.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
              {reportView === "absent"
                ? "No absent staff in this date range."
                : "No punches in this date range."}
            </p>
          ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-[880px] w-full border-collapse text-left text-sm">
              <thead className="bg-zinc-100 dark:bg-zinc-900">
                <tr>
                  <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">Staff</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">Type</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">Shop(s)</th>
                  {reportView === "attendance" ? (
                    <>
                      <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">Present days</th>
                      <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">Hours</th>
                      <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">Log</th>
                    </>
                  ) : (
                    <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">No-punch days</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rangeData.rows.map((row) => (
                  <Fragment key={row.staff_id}>
                    <tr className="odd:bg-white even:bg-zinc-50 dark:odd:bg-zinc-950 dark:even:bg-zinc-900/60">
                      <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                        {labelStaff(row.staff_name, row.staff_status)}
                        <div className="text-xs text-zinc-500">{row.staff_code}</div>
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                        {row.staff_type === "part_time" ? "Part time" : "Full time"}
                      </td>
                      <td className="max-w-[200px] border-b border-zinc-100 px-3 py-2 text-xs dark:border-zinc-800">
                        {reportView === "absent" ? "—" : row.shops_label}
                      </td>
                      {reportView === "attendance" ? (
                        <>
                          <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">{row.present_days}</td>
                          <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">{row.total_hours_label}</td>
                          <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                            <button
                              type="button"
                              className="text-blue-600 underline dark:text-blue-400"
                              onClick={() =>
                                setExpanded((v) => (v === `r-${row.staff_id}` ? null : `r-${row.staff_id}`))
                              }
                            >
                              {expanded === `r-${row.staff_id}` ? "Hide" : "Show"}
                            </button>
                          </td>
                        </>
                      ) : (
                        <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">{row.no_punch_days}</td>
                      )}
                    </tr>
                    {reportView === "attendance" && expanded === `r-${row.staff_id}` ? (
                      <tr>
                        <td colSpan={7} className="border-b border-zinc-100 bg-zinc-50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
                          {row.history.length === 0 ? (
                            <p className="text-sm text-zinc-600">No records in range.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[720px] text-xs">
                                <thead>
                                  <tr className="text-left text-zinc-500">
                                    <th className="py-1 pr-2">Date</th>
                                    <th className="py-1 pr-2">Time</th>
                                    <th className="py-1 pr-2">Shop</th>
                                    <th className="py-1 pr-2">Action</th>
                                    <th className="py-1 pr-2">GPS</th>
                                    <th className="py-1">Distance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.history.map((h) => {
                                    const gpsStatus = gpsStatusLabel(h);
                                    return (
                                      <tr key={h.id}>
                                        <td className="py-1 pr-2">{recordEventDate(h)}</td>
                                        <td className="py-1 pr-2">{recordEventTime(h)}</td>
                                        <td className="py-1 pr-2">{h.shop_name}</td>
                                        <td className="py-1 pr-2">{h.action_type === "clock_in" ? "In" : "Out"}</td>
                                        <td className="py-1 pr-2">{gpsStatus}</td>
                                        <td className="py-1">
                                          {formatGpsDistanceMeters(h.distance_from_shop_meters)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </section>
      ) : null}

      {mode === "week" && weekData ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {reportView === "absent" ? "Absent report" : "Attendance"} — {shopTitle(shops, shopId)} — week{" "}
            {weekData.week_start} (Mon–Sun)
          </h2>
          {weekData.rows.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
              {reportView === "absent"
                ? "No absent staff for this week."
                : "No punches this week for the current filters."}
            </p>
          ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-[960px] w-full border-collapse text-left text-sm">
              <thead className="bg-zinc-100 dark:bg-zinc-900">
                <tr>
                  <th className="sticky left-0 z-10 border-b border-zinc-200 bg-zinc-100 px-3 py-2 font-medium dark:border-zinc-800 dark:bg-zinc-900">
                    Staff
                  </th>
                  <th className="border-b border-zinc-200 px-2 py-2 text-xs font-medium dark:border-zinc-800">Type</th>
                  {weekData.days.map((d) => (
                    <th
                      key={d}
                      className="border-b border-zinc-200 px-2 py-2 text-center text-xs font-medium dark:border-zinc-800"
                    >
                      {d.slice(5)}
                    </th>
                  ))}
                  <th className="border-b border-zinc-200 px-3 py-2 text-center font-medium dark:border-zinc-800">
                    Days
                  </th>
                  <th className="border-b border-zinc-200 px-3 py-2 text-center font-medium dark:border-zinc-800">
                    Hours
                  </th>
                </tr>
              </thead>
              <tbody>
                {weekData.rows.map((r) => (
                  <tr
                    key={r.staff_id}
                    className="odd:bg-white even:bg-zinc-50 dark:odd:bg-zinc-950 dark:even:bg-zinc-900/60"
                  >
                    <td className="sticky left-0 z-10 border-b border-zinc-100 bg-white px-3 py-2 font-medium dark:border-zinc-800 dark:bg-zinc-950">
                      {labelStaff(r.staff_name, r.staff_status)}
                      <div className="text-xs font-normal text-zinc-500">{r.staff_code}</div>
                    </td>
                    <td className="border-b border-zinc-100 px-2 py-2 text-xs dark:border-zinc-800">
                      {r.staff_type === "part_time" ? "PT" : "FT"}
                    </td>
                    {weekData.days.map((d) => {
                      const cell = r.daily[d];
                      return (
                        <td
                          key={d}
                          className="border-b border-zinc-100 px-1 py-2 text-center text-xs dark:border-zinc-800"
                        >
                          <div
                            className={
                              cell?.present
                                ? "rounded-md bg-emerald-100 px-1 py-1 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
                                : "rounded-md bg-zinc-100 px-1 py-1 text-zinc-500 dark:bg-zinc-900"
                            }
                          >
                            {cell?.present ? cell.hours_label : "—"}
                          </div>
                        </td>
                      );
                    })}
                    <td className="border-b border-zinc-100 px-3 py-2 text-center dark:border-zinc-800">
                      {r.total_present_days}
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2 text-center font-medium dark:border-zinc-800">
                      {r.total_hours_label}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </section>
      ) : null}

      {mode === "month" && monthData ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {reportView === "absent" ? "Absent report" : "Attendance"} — {shopTitle(shops, shopId)} —{" "}
            {monthData.month}{" "}
            <span className="text-sm font-normal text-zinc-500">({monthData.days_in_month} days)</span>
          </h2>
          {monthData.rows.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
              {reportView === "absent"
                ? "No absent staff for this month."
                : "No punches this month for the current filters."}
            </p>
          ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-[720px] w-full border-collapse text-left text-sm">
              <thead className="bg-zinc-100 dark:bg-zinc-900">
                <tr>
                  <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">Staff</th>
                  <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">Type</th>
                  {reportView === "attendance" ? (
                    <>
                      <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">Present days</th>
                      <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">Hours</th>
                    </>
                  ) : (
                    <th className="border-b border-zinc-200 px-3 py-2 font-medium dark:border-zinc-800">No-punch days</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {monthData.rows.map((r) => (
                  <tr
                    key={r.staff_id}
                    className="odd:bg-white even:bg-zinc-50 dark:odd:bg-zinc-950 dark:even:bg-zinc-900/60"
                  >
                    <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                      {labelStaff(r.staff_name, r.staff_status)}
                      <div className="text-xs text-zinc-500">{r.staff_code}</div>
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                      {r.staff_type === "part_time" ? "Part time" : "Full time"}
                    </td>
                    {reportView === "attendance" ? (
                      <>
                        <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">{r.present_days}</td>
                        <td className="border-b border-zinc-100 px-3 py-2 font-medium dark:border-zinc-800">
                          {r.total_hours_label}
                        </td>
                      </>
                    ) : (
                      <td className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">{r.no_punch_days}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
          <p className="text-xs text-zinc-500">
            {reportView === "absent"
              ? "Staff with zero punch days in the month."
              : "Only staff with at least one punch in the month."}
          </p>
        </section>
      ) : null}
    </div>
  );
}

"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { mondayOfWeekContaining, type AttendanceRecord } from "@/lib/attendance";
import type { DayCellDetail, DayIssueStats, ReportSummary } from "@/lib/attendance-report";
import { scoreLabel } from "@/lib/attendance-report";
import { IssueBadges } from "./IssueBadges";
import { PunchLogTable } from "./PunchLogTable";
import { ReportSummaryCards } from "./ReportSummaryCards";
import {
  exportDayCsv,
  exportMonthCsv,
  exportPunchLogCsv,
  exportWeekCsv,
} from "./export-report-csv";

export type Shop = { id: string; name: string };
export type Staff = { id: string; staff_name: string; status?: string };

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
  issues: DayIssueStats;
  history: AttendanceRecord[];
};

type WeekRow = {
  staff_id: string;
  staff_name: string;
  staff_code: string;
  staff_type: string;
  staff_status?: string;
  daily: Record<string, DayCellDetail>;
  total_present_days: number;
  total_hours_label: string;
  history: AttendanceRecord[];
};

type MonthRow = {
  staff_id: string;
  staff_name: string;
  staff_code: string;
  staff_type: string;
  staff_status?: string;
  present_days: number;
  total_hours_label: string;
  missing_clock_out_days: number;
  weak_gps_count: number;
  rejected_gps_count: number;
  review_required_count: number;
  summary_score: number;
  history: AttendanceRecord[];
};

type RangeRow = {
  staff_id: string;
  staff_name: string;
  staff_code: string;
  staff_type: string;
  staff_status?: string;
  shops_label: string;
  present_days: number;
  total_hours_label: string;
  daily: Record<string, DayCellDetail>;
  history: AttendanceRecord[];
};

const EMPTY_SUMMARY: ReportSummary = {
  total_present_staff: 0,
  total_hours_ms: 0,
  total_hours_label: "0h 0m",
  missing_clock_out_count: 0,
  weak_indoor_count: 0,
  rejected_gps_count: 0,
  review_required_count: 0,
  gps_issues_count: 0,
};

function labelStaff(name: string, status?: string) {
  if (status === "inactive") return `${name} (inactive)`;
  return name;
}

function shopTitle(shops: Shop[], shopId: string): string {
  if (!shopId || shopId === "__all__") return "All shops";
  return shops.find((s) => s.id === shopId)?.name ?? "Shop";
}

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dayShort(ymd: string) {
  const d = new Date(`${ymd}T12:00:00`);
  return d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric" });
}

type Props = {
  shops: Shop[];
  staff: Staff[];
  reportView: ReportView;
};

export function AttendanceReportPanel({ shops, staff, reportView }: Props) {
  const [shopId, setShopId] = useState("__all__");
  const [staffFilterId, setStaffFilterId] = useState("");
  const [staffTypeFilter, setStaffTypeFilter] = useState("");
  const [gpsStatusFilter, setGpsStatusFilter] = useState("");
  const [issueTypeFilter, setIssueTypeFilter] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [mode, setMode] = useState<"day" | "week" | "month" | "range">("day");
  const [dayDate, setDayDate] = useState(todayYmd);
  const [rangeFrom, setRangeFrom] = useState(todayYmd);
  const [rangeTo, setRangeTo] = useState(todayYmd);
  const [weekAnchor, setWeekAnchor] = useState(todayYmd);
  const [monthValue, setMonthValue] = useState(currentMonthValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReportSummary>(EMPTY_SUMMARY);
  const [dayData, setDayData] = useState<{ date: string; staffRows: DayStaffRow[] } | null>(null);
  const [weekData, setWeekData] = useState<{
    week_start: string;
    days: string[];
    rows: WeekRow[];
  } | null>(null);
  const [monthData, setMonthData] = useState<{
    month: string;
    days_in_month: number;
    rows: MonthRow[];
  } | null>(null);
  const [rangeData, setRangeData] = useState<{
    from: string;
    to: string;
    rows: RangeRow[];
  } | null>(null);
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [expandedWeekCell, setExpandedWeekCell] = useState<string | null>(null);
  const [expandedMonthStaff, setExpandedMonthStaff] = useState<string | null>(null);

  const weekStart = useMemo(() => mondayOfWeekContaining(weekAnchor), [weekAnchor]);

  const staffForFilter = useMemo(
    () => (showInactive ? staff : staff.filter((s) => s.status !== "inactive")),
    [staff, showInactive],
  );

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const shopQs = shopId && shopId !== "__all__" ? shopId : "__all__";
      const qs = new URLSearchParams({
        shop_id: shopQs,
        view: reportView,
        include_inactive: showInactive ? "true" : "false",
      });
      if (staffFilterId) qs.set("staff_id", staffFilterId);
      if (staffTypeFilter) qs.set("staff_type", staffTypeFilter);
      if (gpsStatusFilter) qs.set("gps_status", gpsStatusFilter);
      if (issueTypeFilter) qs.set("issue_type", issueTypeFilter);

      if (mode === "day") {
        qs.set("mode", "day");
        qs.set("date", dayDate);
      } else if (mode === "week") {
        qs.set("mode", "week");
        qs.set("week_start", weekStart);
      } else if (mode === "month") {
        qs.set("mode", "month");
        qs.set("month", monthValue);
      } else {
        qs.set("mode", "range");
        qs.set("from", rangeFrom);
        qs.set("to", rangeTo);
      }

      const res = await fetch(`/api/admin/report?${qs}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to load report");

      setSummary(j.summary ?? EMPTY_SUMMARY);

      if (mode === "day") {
        setDayData({ date: j.date, staffRows: j.staffRows ?? [] });
        setWeekData(null);
        setMonthData(null);
        setRangeData(null);
      } else if (mode === "week") {
        setWeekData({
          week_start: j.week_start,
          days: j.days,
          rows: j.rows ?? [],
        });
        setDayData(null);
        setMonthData(null);
        setRangeData(null);
      } else if (mode === "month") {
        setMonthData({
          month: j.month,
          days_in_month: j.days_in_month,
          rows: j.rows ?? [],
        });
        setDayData(null);
        setWeekData(null);
        setRangeData(null);
      } else {
        setRangeData({ from: j.from, to: j.to, rows: j.rows ?? [] });
        setDayData(null);
        setWeekData(null);
        setMonthData(null);
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
    staffFilterId,
    staffTypeFilter,
    gpsStatusFilter,
    issueTypeFilter,
    reportView,
    showInactive,
  ]);

  useEffect(() => {
    const t = window.setTimeout(() => void fetchReport(), 0);
    return () => window.clearTimeout(t);
  }, [fetchReport]);

  const handleExport = () => {
    if (reportView !== "attendance") return;
    if (mode === "day" && dayData) {
      exportDayCsv(dayData.date, dayData.staffRows);
      exportPunchLogCsv(dayData.date, dayData.staffRows);
    } else if (mode === "week" && weekData) {
      exportWeekCsv(weekData.week_start, weekData.days, weekData.rows);
      exportPunchLogCsv(
        weekData.week_start,
        weekData.rows.filter((r) => r.history?.length).map((r) => ({
          staff_name: r.staff_name,
          staff_code: r.staff_code,
          history: r.history,
        })),
      );
    } else if (mode === "month" && monthData) {
      exportMonthCsv(monthData.month, monthData.rows);
      exportPunchLogCsv(monthData.month, monthData.rows);
    } else if (mode === "range" && rangeData) {
      exportPunchLogCsv(`${rangeData.from}_${rangeData.to}`, rangeData.rows);
    }
  };

  const titleSuffix =
    mode === "day" && dayData
      ? dayData.date
      : mode === "week" && weekData
        ? `week ${weekData.week_start}`
        : mode === "month" && monthData
          ? monthData.month
          : rangeData
            ? `${rangeData.from} – ${rangeData.to}`
            : "";

  return (
    <>
      <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
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

        <label className="flex min-w-[120px] flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
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

        <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
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

        {reportView === "attendance" ? (
          <>
            <label className="flex min-w-[130px] flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              GPS status
              <select
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
                value={gpsStatusFilter}
                onChange={(e) => setGpsStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="verified">Verified</option>
                <option value="weak_indoor">Weak indoor</option>
                <option value="review_required">Review required</option>
                <option value="rejected">Rejected</option>
                <option value="location_na">No location</option>
              </select>
            </label>

            <label className="flex min-w-[130px] flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Issue type
              <select
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
                value={issueTypeFilter}
                onChange={(e) => setIssueTypeFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="any">Any issue</option>
                <option value="none">No issues</option>
                <option value="missing_clock_out">Missing clock out</option>
                <option value="weak_indoor">Weak indoor GPS</option>
                <option value="review_required">Review required</option>
                <option value="rejected_gps">Rejected GPS</option>
              </select>
            </label>
          </>
        ) : null}

        <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-zinc-300"
          />
          Show inactive
        </label>

        <div className="flex flex-wrap gap-2">
          {(["day", "week", "month", "range"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-2 text-sm font-medium capitalize sm:px-4 ${
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

        {mode === "week" ? (
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Week
            <input
              type="date"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
              value={weekAnchor}
              onChange={(e) => setWeekAnchor(e.target.value)}
            />
          </label>
        ) : null}

        {mode === "month" ? (
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Month
            <input
              type="month"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
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

        <div className="flex flex-wrap gap-2 self-end">
          <button
            type="button"
            onClick={() => void fetchReport()}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          {reportView === "attendance" ? (
            <button
              type="button"
              onClick={handleExport}
              disabled={loading}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            >
              Export CSV
            </button>
          ) : null}
        </div>
      </section>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {reportView === "attendance" && !loading ? (
        <ReportSummaryCards summary={summary} />
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {reportView === "absent" ? "Absent report" : "Attendance"} — {shopTitle(shops, shopId)}
          {titleSuffix ? ` — ${titleSuffix}` : ""}
        </h2>

        {mode === "day" && dayData ? (
          <DayView
            date={dayData.date}
            rows={dayData.staffRows}
            reportView={reportView}
            expanded={expandedStaff}
            setExpanded={setExpandedStaff}
          />
        ) : null}

        {mode === "week" && weekData ? (
          <WeekView
            days={weekData.days}
            rows={weekData.rows}
            reportView={reportView}
            expandedCell={expandedWeekCell}
            setExpandedCell={setExpandedWeekCell}
          />
        ) : null}

        {mode === "month" && monthData ? (
          <MonthView
            month={monthData.month}
            rows={monthData.rows}
            reportView={reportView}
            expanded={expandedMonthStaff}
            setExpanded={setExpandedMonthStaff}
          />
        ) : null}

        {mode === "range" && rangeData ? (
          <RangeView
            rows={rangeData.rows}
            reportView={reportView}
            expanded={expandedStaff}
            setExpanded={setExpandedStaff}
          />
        ) : null}

        {!dayData && !weekData && !monthData && !rangeData && !loading ? (
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50">
            No data for current filters.
          </p>
        ) : null}
      </section>
    </>
  );
}

function DayView({
  date,
  rows,
  reportView,
  expanded,
  setExpanded,
}: {
  date: string;
  rows: DayStaffRow[];
  reportView: ReportView;
  expanded: string | null;
  setExpanded: (v: string | null) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50">
        {reportView === "absent" ? "No absent staff for this date." : "No punches for this date."}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-[900px] w-full border-collapse text-left text-sm">
        <thead className="bg-zinc-100 dark:bg-zinc-900">
          <tr>
            <th className="border-b px-3 py-2 font-medium dark:border-zinc-800">Staff</th>
            <th className="border-b px-3 py-2 font-medium dark:border-zinc-800">Type</th>
            {reportView === "attendance" ? (
              <>
                <th className="border-b px-3 py-2 font-medium dark:border-zinc-800">First in</th>
                <th className="border-b px-3 py-2 font-medium dark:border-zinc-800">Last out</th>
                <th className="border-b px-3 py-2 font-medium dark:border-zinc-800">Hours</th>
                <th className="border-b px-3 py-2 font-medium dark:border-zinc-800">Issues</th>
                <th className="border-b px-3 py-2 font-medium dark:border-zinc-800">Log</th>
              </>
            ) : (
              <th className="border-b px-3 py-2 font-medium dark:border-zinc-800">Status</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Fragment key={row.staff_id}>
              <tr className="odd:bg-white even:bg-zinc-50 dark:odd:bg-zinc-950 dark:even:bg-zinc-900/60">
                <td className="border-b px-3 py-2 dark:border-zinc-800">
                  {labelStaff(row.staff_name, row.staff_status)}
                  <div className="text-xs text-zinc-500">{row.staff_code}</div>
                </td>
                <td className="border-b px-3 py-2 dark:border-zinc-800">
                  {row.staff_type === "part_time" ? "Part time" : "Full time"}
                </td>
                {reportView === "attendance" ? (
                  <>
                    <td className="border-b px-3 py-2 dark:border-zinc-800">{row.first_in ?? "—"}</td>
                    <td className="border-b px-3 py-2 dark:border-zinc-800">{row.last_out ?? "—"}</td>
                    <td className="border-b px-3 py-2 font-medium dark:border-zinc-800">
                      {row.total_hours_label}
                    </td>
                    <td className="border-b px-3 py-2 dark:border-zinc-800">
                      <IssueBadges issues={row.issues} />
                    </td>
                    <td className="border-b px-3 py-2 dark:border-zinc-800">
                      <button
                        type="button"
                        className="text-blue-600 underline dark:text-blue-400"
                        onClick={() => setExpanded(expanded === row.staff_id ? null : row.staff_id)}
                      >
                        {expanded === row.staff_id ? "Hide" : "Show"}
                      </button>
                    </td>
                  </>
                ) : (
                  <td className="border-b px-3 py-2 text-amber-700 dark:text-amber-300">Absent</td>
                )}
              </tr>
              {reportView === "attendance" && expanded === row.staff_id ? (
                <tr>
                  <td colSpan={7} className="border-b bg-zinc-50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Punch log — {date}
                    </p>
                    <PunchLogTable rows={row.history} />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeekView({
  days,
  rows,
  reportView,
  expandedCell,
  setExpandedCell,
}: {
  days: string[];
  rows: WeekRow[];
  reportView: ReportView;
  expandedCell: string | null;
  setExpandedCell: (v: string | null) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-800">
        No data for this week.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-[960px] w-full border-collapse text-left text-sm">
          <thead className="bg-zinc-100 dark:bg-zinc-900">
            <tr>
              <th className="sticky left-0 z-10 border-b bg-zinc-100 px-3 py-2 font-medium dark:bg-zinc-900">
                Staff
              </th>
              {days.map((d) => (
                <th key={d} className="min-w-[72px] border-b px-1 py-2 text-center text-xs font-medium">
                  {dayShort(d)}
                </th>
              ))}
              <th className="border-b px-2 py-2 text-center font-medium">Days</th>
              <th className="border-b px-2 py-2 text-center font-medium">Hours</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.staff_id}>
                <tr className="odd:bg-white even:bg-zinc-50 dark:odd:bg-zinc-950 dark:even:bg-zinc-900/60">
                  <td className="sticky left-0 z-10 border-b bg-white px-3 py-2 font-medium dark:bg-zinc-950">
                    {labelStaff(r.staff_name, r.staff_status)}
                    <div className="text-xs font-normal text-zinc-500">{r.staff_code}</div>
                  </td>
                  {days.map((d) => {
                    const cell = r.daily[d];
                    const cellKey = `${r.staff_id}-${d}`;
                    const isOpen = expandedCell === cellKey;
                    return (
                      <td key={d} className="border-b px-0.5 py-1 align-top dark:border-zinc-800">
                        {cell?.present && reportView === "attendance" ? (
                          <button
                            type="button"
                            onClick={() => setExpandedCell(isOpen ? null : cellKey)}
                            className={`w-full rounded-md px-1 py-1.5 text-center text-[10px] leading-tight sm:text-xs ${
                              cell.issues.issue_count > 0
                                ? "bg-amber-100 text-amber-950 ring-1 ring-amber-300 dark:bg-amber-950/50 dark:text-amber-100"
                                : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
                            } ${isOpen ? "ring-2 ring-blue-500" : ""}`}
                          >
                            <div className="font-semibold">{cell.hours_label}</div>
                            {cell.issues.issue_count > 0 ? (
                              <div className="mt-0.5 text-[9px] opacity-90">
                                {cell.issues.issue_count} issue{cell.issues.issue_count > 1 ? "s" : ""}
                              </div>
                            ) : null}
                          </button>
                        ) : (
                          <div className="rounded-md bg-zinc-100 px-1 py-1.5 text-center text-xs text-zinc-400 dark:bg-zinc-900">
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="border-b px-2 py-2 text-center dark:border-zinc-800">
                    {r.total_present_days}
                  </td>
                  <td className="border-b px-2 py-2 text-center font-medium dark:border-zinc-800">
                    {r.total_hours_label}
                  </td>
                </tr>
                {reportView === "attendance" && days.map((d) => {
                  const cellKey = `${r.staff_id}-${d}`;
                  if (expandedCell !== cellKey) return null;
                  const cell = r.daily[d];
                  if (!cell?.present) return null;
                  return (
                    <tr key={cellKey}>
                      <td colSpan={days.length + 3} className="border-b bg-zinc-50 px-3 py-3 dark:bg-zinc-900/80">
                        <p className="mb-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          {labelStaff(r.staff_name, r.staff_status)} — {d}
                        </p>
                        <p className="mb-2 text-xs text-zinc-500">
                          In {cell.first_in ?? "—"} · Out {cell.last_out ?? "—"} · {cell.hours_label}
                        </p>
                        <IssueBadges issues={cell.issues} />
                        <div className="mt-3">
                          <PunchLogTable rows={cell.history} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500">Tap a day cell to expand punch log and GPS details.</p>
    </div>
  );
}

function MonthView({
  month,
  rows,
  reportView,
  expanded,
  setExpanded,
}: {
  month: string;
  rows: MonthRow[];
  reportView: ReportView;
  expanded: string | null;
  setExpanded: (v: string | null) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-800">
        No punches this month.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-[1000px] w-full border-collapse text-left text-sm">
        <thead className="bg-zinc-100 dark:bg-zinc-900">
          <tr>
            <th className="border-b px-3 py-2 font-medium">Staff</th>
            <th className="border-b px-3 py-2 font-medium">Present</th>
            <th className="border-b px-3 py-2 font-medium">Hours</th>
            <th className="border-b px-3 py-2 font-medium">Miss out</th>
            <th className="border-b px-3 py-2 font-medium">Weak GPS</th>
            <th className="border-b px-3 py-2 font-medium">Rejected</th>
            <th className="border-b px-3 py-2 font-medium">Review</th>
            <th className="border-b px-3 py-2 font-medium">Score</th>
            <th className="border-b px-3 py-2 font-medium">Log</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Fragment key={r.staff_id}>
              <tr className="odd:bg-white even:bg-zinc-50 dark:odd:bg-zinc-950 dark:even:bg-zinc-900/60">
                <td className="border-b px-3 py-2">
                  {labelStaff(r.staff_name, r.staff_status)}
                  <div className="text-xs text-zinc-500">{r.staff_code}</div>
                </td>
                <td className="border-b px-3 py-2">{r.present_days}</td>
                <td className="border-b px-3 py-2 font-medium">{r.total_hours_label}</td>
                <td className="border-b px-3 py-2">{r.missing_clock_out_days}</td>
                <td className="border-b px-3 py-2">{r.weak_gps_count}</td>
                <td className="border-b px-3 py-2">{r.rejected_gps_count}</td>
                <td className="border-b px-3 py-2">{r.review_required_count}</td>
                <td className="border-b px-3 py-2">
                  <span className="font-bold">{r.summary_score}</span>
                  <div className="text-xs text-zinc-500">{scoreLabel(r.summary_score)}</div>
                </td>
                <td className="border-b px-3 py-2">
                  {reportView === "attendance" ? (
                    <button
                      type="button"
                      className="text-blue-600 underline dark:text-blue-400"
                      onClick={() => setExpanded(expanded === r.staff_id ? null : r.staff_id)}
                    >
                      {expanded === r.staff_id ? "Hide" : "Show"}
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
              {reportView === "attendance" && expanded === r.staff_id ? (
                <tr>
                  <td colSpan={9} className="border-b bg-zinc-50 px-3 py-3 dark:bg-zinc-900/80">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      All punches — {month}
                    </p>
                    <PunchLogTable rows={r.history} showDate />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RangeView({
  rows,
  reportView,
  expanded,
  setExpanded,
}: {
  rows: RangeRow[];
  reportView: ReportView;
  expanded: string | null;
  setExpanded: (v: string | null) => void;
}) {
  if (rows.length === 0) {
    return <p className="text-center text-sm text-zinc-600">No data in range.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-[720px] w-full text-sm">
        <thead className="bg-zinc-100 dark:bg-zinc-900">
          <tr>
            <th className="px-3 py-2">Staff</th>
            <th className="px-3 py-2">Present days</th>
            <th className="px-3 py-2">Hours</th>
            <th className="px-3 py-2">Log</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Fragment key={r.staff_id}>
              <tr>
                <td className="border-b px-3 py-2">
                  {labelStaff(r.staff_name, r.staff_status)}
                  <div className="text-xs text-zinc-500">{r.staff_code}</div>
                </td>
                <td className="border-b px-3 py-2">{r.present_days}</td>
                <td className="border-b px-3 py-2">{r.total_hours_label}</td>
                <td className="border-b px-3 py-2">
                  <button
                    type="button"
                    className="text-blue-600 underline"
                    onClick={() => setExpanded(expanded === r.staff_id ? null : r.staff_id)}
                  >
                    {expanded === r.staff_id ? "Hide" : "Show"}
                  </button>
                </td>
              </tr>
              {expanded === r.staff_id ? (
                <tr>
                  <td colSpan={4} className="bg-zinc-50 px-3 py-3 dark:bg-zinc-900/80">
                    <PunchLogTable rows={r.history} showDate />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}


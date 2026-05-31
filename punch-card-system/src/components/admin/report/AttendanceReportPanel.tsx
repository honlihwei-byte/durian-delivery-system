"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  dayShopStatusFromRows,
  gpsStatusLabel,
  mondayOfWeekContaining,
  type AttendanceRecord,
  type DayShopStatus,
} from "@/lib/attendance";
import { RiskBadges } from "@/components/admin/report/RiskBadges";
import { riskBadgesForRows } from "@/lib/attendance-risk-badges";
import { formatMinutes } from "@/lib/format-minutes";
import type { DayCellDetail, DayIssueStats, ReportSummary } from "@/lib/attendance-report";
import { IssueBadges } from "./IssueBadges";
import { MonthReportView } from "./MonthReportView";
import { PunchLogTable } from "./PunchLogTable";
import { ReportSummaryCards } from "./ReportSummaryCards";
import { AttendanceSummaryChart } from "./AttendanceSummaryChart";
import {
  dashboardCard,
  dashboardInput,
  dashboardLabel,
  dashboardPrimaryBtn,
  dashboardSecondaryBtn,
  dashboardTableHead,
  dashboardTableRow,
  dashboardTableWrap,
} from "./dashboard-ui";
import { detectPunchSequenceIssues } from "@/lib/attendance-issues";
import { recordEventDate, recordEventTime } from "@/lib/attendance-db";
import {
  exportDayCsv,
  exportMonthCsv,
  exportPunchLogCsv,
  exportWeekCsv,
} from "./export-report-csv";

export type Shop = { id: string; name: string };
export type Staff = { id: string; staff_name: string; status?: string };

function shiftStatusLabel(status: string | undefined): string | null {
  if (!status || status === "off_day") return null;
  return status.replace(/_/g, " ");
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
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  scheduled_label?: string | null;
  shifts_today?: number;
  late_minutes?: number;
  early_leave_minutes?: number;
  overtime_minutes?: number;
  attendance_status?: string;
  total_hours_label: string;
  current_in_shop: boolean;
  punch_issue: string | null;
  issues: DayIssueStats;
  history: AttendanceRecord[];
};

function maxRiskScore(rows: AttendanceRecord[]): number {
  let max = 0;
  for (const r of rows) max = Math.max(max, Number(r.risk_score ?? 0) || 0);
  return max;
}

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
  total_hours_ms: number;
  total_hours_label: string;
  missing_clock_out_days: number;
  weak_gps_count: number;
  rejected_gps_count: number;
  review_required_count: number;
  summary_score: number;
  issues: DayIssueStats;
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

function DayShopStatusBadge({ status }: { status: DayShopStatus | null }) {
  if (!status) {
    return <span className="text-slate-400">—</span>;
  }
  const styles: Record<DayShopStatus, string> = {
    in_shop: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    out: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    missing_clock_out: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  };
  const labels: Record<DayShopStatus, string> = {
    in_shop: "In Shop",
    out: "Out",
    missing_clock_out: "Missing Clock Out",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function TimingBadges({
  lateMinutes,
  earlyLeaveMinutes,
}: {
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
}) {
  const badges: ReactNode[] = [];
  if (lateMinutes != null && lateMinutes > 0) {
    badges.push(
      <span
        key="late"
        className="inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700 ring-1 ring-orange-200"
      >
        Late
      </span>,
    );
  }
  if (earlyLeaveMinutes != null && earlyLeaveMinutes > 0) {
    badges.push(
      <span
        key="early"
        className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200"
      >
        Early Leave
      </span>,
    );
  }
  if (badges.length === 0) return null;
  return <div className="mt-1 flex flex-wrap gap-1">{badges}</div>;
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

  const [issueDetail, setIssueDetail] = useState<{
    open: boolean;
    title: string;
    severity: "Info" | "Warning" | "High Risk";
    what: string;
    why: string[];
    recommended: string[];
    punches: AttendanceRecord[];
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

      const res = await fetch(`/api/admin/report?${qs}`, { credentials: "include" });
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
    <div className="space-y-8">
      {reportView === "attendance" && !loading && mode !== "month" ? (
        <>
          <ReportSummaryCards summary={summary} />
          <AttendanceSummaryChart
            summary={summary}
            subtitle={
              titleSuffix
                ? `Summary for ${shopTitle(shops, shopId)} · ${titleSuffix}`
                : undefined
            }
          />
        </>
      ) : null}

      {/* Filters */}
      <section className={`${dashboardCard} p-6`}>
        <div className="mb-5">
          <h2 className="text-base font-semibold text-slate-900">Filters</h2>
          <p className="mt-1 text-sm font-normal text-slate-500">
            Refine shop, department, staff, status, and date range
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <label className="flex flex-col gap-2">
          <span className={dashboardLabel}>Shop</span>
          <select
            className={dashboardInput}
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

        <label className="flex flex-col gap-2">
          <span className={dashboardLabel}>Department</span>
          <select
            className={dashboardInput}
            value={staffTypeFilter}
            onChange={(e) => setStaffTypeFilter(e.target.value)}
          >
            <option value="">All departments</option>
            <option value="full_time">Full time</option>
            <option value="part_time">Part time</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className={dashboardLabel}>Staff</span>
          <select
            className={dashboardInput}
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
            <label className="flex flex-col gap-2">
              <span className={dashboardLabel}>Status</span>
              <select
                className={dashboardInput}
                value={gpsStatusFilter}
                onChange={(e) => setGpsStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="verified">Verified</option>
                <option value="weak_indoor">Weak indoor</option>
                <option value="review_required">Review required</option>
                <option value="rejected">Rejected</option>
                <option value="location_na">No location</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className={dashboardLabel}>Issue type</span>
              <select
                className={dashboardInput}
                value={issueTypeFilter}
                onChange={(e) => setIssueTypeFilter(e.target.value)}
              >
                <option value="">All issues</option>
                <option value="any">Any issue</option>
                <option value="none">No issues</option>
                <option value="missing_clock_out">Missing clock out</option>
                <option value="missing_clock_in">Missing clock in</option>
                <option value="missing_punch">Missing punch</option>
                <option value="manual_approved">Manual approved</option>
                <option value="duplicate_prevented">Duplicate prevented</option>
                <option value="duplicate_punch">Duplicate punch</option>
                <option value="suspicious_punch_sequence">Suspicious punch sequence</option>
                <option value="weak_indoor">Weak indoor GPS</option>
                <option value="review_required">Review required</option>
                <option value="rejected_gps">Rejected GPS</option>
              </select>
            </label>
          </>
        ) : null}

        <label className="flex cursor-pointer items-end gap-2 pb-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-slate-300"
          />
          Show inactive
        </label>
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-5">
        <div className="flex flex-wrap gap-2">
          {(["day", "week", "month", "range"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize transition ${
                mode === m
                  ? "bg-slate-900 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {mode === "day" ? (
          <label className="flex flex-col gap-2">
            <span className={dashboardLabel}>Date</span>
            <input
              type="date"
              className={dashboardInput}
              value={dayDate}
              onChange={(e) => setDayDate(e.target.value)}
            />
          </label>
        ) : null}

        {mode === "week" ? (
          <label className="flex flex-col gap-2">
            <span className={dashboardLabel}>Week</span>
            <input
              type="date"
              className={dashboardInput}
              value={weekAnchor}
              onChange={(e) => setWeekAnchor(e.target.value)}
            />
          </label>
        ) : null}

        {mode === "month" ? (
          <label className="flex flex-col gap-2">
            <span className={dashboardLabel}>Month</span>
            <input
              type="month"
              className={dashboardInput}
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
            />
          </label>
        ) : null}

        {mode === "range" ? (
          <>
            <label className="flex flex-col gap-2">
              <span className={dashboardLabel}>From</span>
              <input
                type="date"
                className={dashboardInput}
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={dashboardLabel}>To</span>
              <input
                type="date"
                className={dashboardInput}
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
              />
            </label>
          </>
        ) : null}

        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void fetchReport()}
            disabled={loading}
            className={dashboardPrimaryBtn}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          {reportView === "attendance" ? (
            <button
              type="button"
              onClick={handleExport}
              disabled={loading}
              className={dashboardSecondaryBtn}
            >
              Export CSV
            </button>
          ) : null}
        </div>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {reportView === "absent" ? "Absent report" : "Attendance table"}
            </h2>
            <p className="mt-1 text-sm font-normal text-slate-500">
              {shopTitle(shops, shopId)}
              {titleSuffix ? ` · ${titleSuffix}` : ""}
            </p>
          </div>
        </div>

        {mode === "day" && dayData ? (
          <DayView
            date={dayData.date}
            rows={dayData.staffRows}
            reportView={reportView}
            expanded={expandedStaff}
            setExpanded={setExpandedStaff}
            onOpenIssueDetail={(d) => setIssueDetail({ ...d, open: true })}
          />
        ) : null}

        {mode === "week" && weekData ? (
          <WeekView
            days={weekData.days}
            rows={weekData.rows}
            reportView={reportView}
            expandedCell={expandedWeekCell}
            setExpandedCell={setExpandedWeekCell}
            onOpenIssueDetail={(d) => setIssueDetail({ ...d, open: true })}
          />
        ) : null}

        {mode === "month" && monthData ? (
          <MonthReportView
            month={monthData.month}
            daysInMonth={monthData.days_in_month}
            rows={monthData.rows}
            summary={summary}
            reportView={reportView}
            expanded={expandedMonthStaff}
            setExpanded={setExpandedMonthStaff}
            onOpenIssueDetail={(d) =>
              setIssueDetail({
                open: true,
                title: d.title,
                severity: d.severity,
                what: `${d.date} · ${d.shop}${d.scheduled ? ` · Scheduled ${d.scheduled}` : ""}\n\n${d.what}`,
                why: d.why,
                recommended: d.recommended,
                punches: d.punches as AttendanceRecord[],
              })
            }
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

        {issueDetail?.open ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{issueDetail.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                    Severity:{" "}
                    <span
                      className={
                        issueDetail.severity === "High Risk"
                          ? "font-semibold text-rose-700 dark:text-rose-300"
                          : issueDetail.severity === "Warning"
                            ? "font-semibold text-amber-700 dark:text-amber-300"
                            : "font-semibold text-zinc-700 dark:text-zinc-300"
                      }
                    >
                      {issueDetail.severity}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIssueDetail(null)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold dark:border-zinc-600 dark:bg-zinc-900"
                >
                  Close
                </button>
              </div>
              <div className="max-h-[70vh] overflow-auto p-4">
                <div className="space-y-4">
                  <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">What happened</p>
                    <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">{issueDetail.what}</p>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Why flagged</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-900 dark:text-zinc-50">
                      {issueDetail.why.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Recommended action</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-900 dark:text-zinc-50">
                      {issueDetail.recommended.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Punches</p>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full min-w-[560px] text-xs">
                        <thead className="text-left text-zinc-500">
                          <tr>
                            <th className="py-1 pr-3">Time</th>
                            <th className="py-1 pr-3">Type</th>
                            <th className="py-1 pr-3">GPS</th>
                            <th className="py-1 pr-3">Verified</th>
                            <th className="py-1 pr-3">Device</th>
                          </tr>
                        </thead>
                        <tbody>
                          {issueDetail.punches.map((p) => (
                            <tr key={p.id} className="border-t border-zinc-100 dark:border-zinc-800">
                              <td className="py-1 pr-3 font-mono">{recordEventTime(p)}</td>
                              <td className="py-1 pr-3">{p.action_type === "clock_in" ? "Clock In" : "Clock Out"}</td>
                              <td className="py-1 pr-3">{gpsStatusLabel(p)}</td>
                              <td className="py-1 pr-3">{p.gps_verified ? "Yes" : "No"}</td>
                              <td className="py-1 pr-3 font-mono">{(p.punch_device_id ?? "—").slice(0, 8)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function DayView({
  date,
  rows,
  reportView,
  expanded,
  setExpanded,
  onOpenIssueDetail,
}: {
  date: string;
  rows: DayStaffRow[];
  reportView: ReportView;
  expanded: string | null;
  setExpanded: (v: string | null) => void;
  onOpenIssueDetail: (d: {
    title: string;
    severity: "Info" | "Warning" | "High Risk";
    what: string;
    why: string[];
    recommended: string[];
    punches: AttendanceRecord[];
  }) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className={`${dashboardCard} px-6 py-12 text-center text-sm text-slate-500`}>
        {reportView === "absent" ? "No absent staff for this date." : "No punches for this date."}
      </p>
    );
  }

  return (
    <div className={dashboardTableWrap}>
      <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            <th className={`${dashboardTableHead} px-4 py-3.5`}>Staff</th>
            <th className={`${dashboardTableHead} px-4 py-3.5`}>Type</th>
            {reportView === "attendance" ? (
              <>
                <th className={`${dashboardTableHead} px-4 py-3.5`}>Status</th>
                <th className={`${dashboardTableHead} px-4 py-3.5`}>Scheduled</th>
                <th className={`${dashboardTableHead} px-4 py-3.5`}>Shifts</th>
                <th className={`${dashboardTableHead} px-4 py-3.5`}>First in</th>
                <th className={`${dashboardTableHead} px-4 py-3.5`}>Last out</th>
                <th className={`${dashboardTableHead} px-4 py-3.5`}>Late</th>
                <th className={`${dashboardTableHead} px-4 py-3.5`}>Early</th>
                <th className={`${dashboardTableHead} px-4 py-3.5`}>OT</th>
                <th className={`${dashboardTableHead} px-4 py-3.5`}>Hours</th>
                <th className={`${dashboardTableHead} px-4 py-3.5`}>Risk</th>
                <th className={`${dashboardTableHead} px-4 py-3.5`}>Issues</th>
                <th className={`${dashboardTableHead} px-4 py-3.5`}>Log</th>
              </>
            ) : (
              <th className={`${dashboardTableHead} px-4 py-3.5`}>Status</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <Fragment key={row.staff_id}>
              <tr className={`${dashboardTableRow} ${idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"}`}>
                <td className="px-4 py-3.5">
                  <span className="font-medium text-slate-900">{labelStaff(row.staff_name, row.staff_status)}</span>
                  <div className="text-xs text-slate-500">{row.staff_code}</div>
                </td>
                <td className="px-4 py-3.5 text-slate-600">
                  {row.staff_type === "part_time" ? "Part time" : "Full time"}
                </td>
                {reportView === "attendance" ? (
                  <>
                    <td className="px-4 py-3.5">
                      <DayShopStatusBadge status={dayShopStatusFromRows(row.history, date)} />
                      <TimingBadges
                        lateMinutes={row.late_minutes}
                        earlyLeaveMinutes={row.early_leave_minutes}
                      />
                      {shiftStatusLabel(row.attendance_status) ? (
                        <div className="mt-1 text-xs capitalize text-slate-500">
                          {shiftStatusLabel(row.attendance_status)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                      {row.scheduled_label ??
                        (row.scheduled_start && row.scheduled_end
                          ? `${row.scheduled_start}–${row.scheduled_end}`
                          : "—")}
                    </td>
                    <td className="px-4 py-3.5 text-center tabular-nums text-slate-600">
                      {(row.shifts_today ?? 0) > 0 ? `${row.shifts_today} shift${row.shifts_today === 1 ? "" : "s"}` : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{row.first_in ?? "—"}</td>
                    <td className="px-4 py-3.5 text-slate-700">{row.last_out ?? "—"}</td>
                    <td className="px-4 py-3.5 tabular-nums text-slate-600">
                      {row.late_minutes != null ? formatMinutes(row.late_minutes) : "—"}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-slate-600">
                      {row.early_leave_minutes != null ? formatMinutes(row.early_leave_minutes) : "—"}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-slate-600">
                      {row.overtime_minutes != null ? formatMinutes(row.overtime_minutes) : "—"}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">
                      {row.total_hours_label}
                    </td>
                    <td className="px-4 py-3.5">
                      <RiskBadges
                        badges={riskBadgesForRows(row.history)}
                        compact
                        riskScore={maxRiskScore(row.history) || undefined}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <IssueBadges
                        issues={row.issues}
                        onBadgeClick={(badge) => {
                          const punches = row.history ?? [];
                          const seq = detectPunchSequenceIssues(punches);

                          if (badge === "duplicate_punch") {
                            const ex = seq.duplicate_examples[0];
                            const why =
                              seq.duplicate_examples.length > 0
                                ? [
                                    `Same action, same shop, same device within 15 seconds with no meaningful GPS change.`,
                                    `Example: ${seq.duplicate_examples.length} duplicate pair(s) detected.`,
                                  ]
                                : ["Same action repeated rapidly with no meaningful GPS change."];
                            onOpenIssueDetail({
                              title: "Duplicate Punch detected",
                              severity: "Info",
                              what: ex
                                ? `Duplicate retry detected within ~${ex.seconds_apart}s.`
                                : "Duplicate retry detected.",
                              why,
                              recommended: [
                                "If this was a normal retry (network/scan issue), you can ignore.",
                                "If it happens frequently, check device connection or user behavior.",
                              ],
                              punches,
                            });
                            return;
                          }

                          if (badge === "suspicious_punch_sequence") {
                            onOpenIssueDetail({
                              title: "Suspicious Punch Sequence",
                              severity: "High Risk",
                              what: "Punch sequence contains patterns that are hard to explain as normal breaks or split shifts.",
                              why:
                                seq.suspicious_reasons.length > 0
                                  ? seq.suspicious_reasons
                                  : ["Impossible or spam-like punch sequence detected."],
                              recommended: [
                                "Open the punch log and verify the sequence against CCTV or supervisor confirmation.",
                                "If legitimate, consider manual approval and coach staff on correct punching.",
                              ],
                              punches,
                            });
                            return;
                          }

                          if (badge === "rejected_gps") {
                            onOpenIssueDetail({
                              title: "GPS Issue: Rejected location",
                              severity: "High Risk",
                              what: "One or more punches were rejected due to location/radius checks.",
                              why: ["GPS verification failed (outside allowed radius or rejected location)."],
                              recommended: [
                                "Verify staff was physically in the shop when punching.",
                                "If the allowed radius is too strict, adjust shop GPS radius.",
                              ],
                              punches,
                            });
                            return;
                          }

                          if (badge === "missing_clock_out") {
                            onOpenIssueDetail({
                              title: "Missing Clock Out",
                              severity: "Warning",
                              what: `Staff clocked in but did not clock out on ${recordEventDate(punches[0] ?? ({} as any)) ?? date}.`,
                              why: ["Last accepted punch is a Clock In (no closing Clock Out)."],
                              recommended: [
                                "Ask staff to submit a forgot punch request or add a manual adjustment (if supported).",
                                "Coach staff to always clock out before leaving.",
                              ],
                              punches,
                            });
                            return;
                          }

                          if (badge === "photo_proof") {
                            onOpenIssueDetail({
                              title: "Photo Proof Required",
                              severity: "Warning",
                              what: "One or more punches required photo proof.",
                              why: ["Photo proof was requested due to policy/risk signals."],
                              recommended: ["Review the selfie/photo proof and confirm the identity.", "Mark as reviewed if valid."],
                              punches,
                            });
                            return;
                          }

                          if (badge === "manual_approved") {
                            onOpenIssueDetail({
                              title: "Manual Approved",
                              severity: "Info",
                              what: "One or more punches were manually approved by an admin.",
                              why: ["Admin override was applied to accept the punch."],
                              recommended: ["No action needed if approval is correct.", "If frequent, improve GPS/QR placement or staff training."],
                              punches,
                            });
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        className="rounded-lg px-2.5 py-1 text-sm font-semibold text-[#2563EB] transition hover:bg-blue-50"
                        onClick={() => setExpanded(expanded === row.staff_id ? null : row.staff_id)}
                      >
                        {expanded === row.staff_id ? "Hide" : "Show"}
                      </button>
                    </td>
                  </>
                ) : (
                  <td className="px-4 py-3.5">
                    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                      Absent
                    </span>
                  </td>
                )}
              </tr>
              {reportView === "attendance" && expanded === row.staff_id ? (
                <tr>
                  <td colSpan={13} className="border-b border-slate-100 bg-slate-50/80 px-4 py-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
  onOpenIssueDetail,
}: {
  days: string[];
  rows: WeekRow[];
  reportView: ReportView;
  expandedCell: string | null;
  setExpandedCell: (v: string | null) => void;
  onOpenIssueDetail: (d: {
    title: string;
    severity: "Info" | "Warning" | "High Risk";
    what: string;
    why: string[];
    recommended: string[];
    punches: AttendanceRecord[];
  }) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className={`${dashboardCard} px-6 py-12 text-center text-sm text-slate-500`}>
        No data for this week.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className={dashboardTableWrap}>
        <table className="min-w-[960px] w-full border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className={`${dashboardTableHead} sticky left-0 z-20 px-4 py-3.5`}>
                Staff
              </th>
              {days.map((d) => (
                <th key={d} className={`${dashboardTableHead} min-w-[72px] px-2 py-3.5 text-center text-xs`}>
                  {dayShort(d)}
                </th>
              ))}
              <th className={`${dashboardTableHead} px-3 py-3.5 text-center`}>Days</th>
              <th className={`${dashboardTableHead} px-3 py-3.5 text-center`}>Hours</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, rowIdx) => (
              <Fragment key={r.staff_id}>
                <tr className={`${dashboardTableRow} ${rowIdx % 2 === 1 ? "bg-slate-50/50" : "bg-white"}`}>
                  <td className="sticky left-0 z-10 bg-inherit px-4 py-3.5 font-medium text-slate-900">
                    {labelStaff(r.staff_name, r.staff_status)}
                    <div className="text-xs font-normal text-slate-500">{r.staff_code}</div>
                  </td>
                  {days.map((d) => {
                    const cell = r.daily[d];
                    const cellKey = `${r.staff_id}-${d}`;
                    const isOpen = expandedCell === cellKey;
                    return (
                      <td key={d} className="px-1 py-2 align-top">
                        {cell?.present && reportView === "attendance" ? (
                          <button
                            type="button"
                            onClick={() => setExpandedCell(isOpen ? null : cellKey)}
                            className={`w-full rounded-xl px-1 py-2 text-center text-[10px] leading-tight transition sm:text-xs ${
                              cell.issues.issue_count > 0
                                ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"
                                : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
                            } ${isOpen ? "ring-2 ring-[#2563EB]" : ""}`}
                          >
                            <div className="font-semibold">{cell.hours_label}</div>
                            {cell.issues.issue_count > 0 ? (
                              <div className="mt-0.5 text-[9px] opacity-90">
                                {cell.issues.issue_count} issue{cell.issues.issue_count > 1 ? "s" : ""}
                              </div>
                            ) : null}
                          </button>
                        ) : (
                          <div className="rounded-xl bg-slate-50 px-1 py-2 text-center text-xs text-slate-400">
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3.5 text-center text-slate-700">
                    {r.total_present_days}
                  </td>
                  <td className="px-3 py-3.5 text-center font-semibold text-slate-900">
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
                      <td colSpan={days.length + 3} className="border-b border-slate-100 bg-slate-50/80 px-4 py-4">
                        <p className="mb-1 text-xs font-semibold text-slate-800">
                          {labelStaff(r.staff_name, r.staff_status)} — {d}
                        </p>
                        <p className="mb-2 text-xs text-zinc-500">
                          {cell.scheduled_start && cell.scheduled_end
                            ? `Sched. ${cell.scheduled_start}–${cell.scheduled_end} · `
                            : ""}
                          In {cell.first_in ?? "—"} · Out {cell.last_out ?? "—"} · {cell.hours_label}
                          {cell.late_minutes != null && cell.late_minutes > 0
                            ? ` · Late ${formatMinutes(cell.late_minutes)}`
                            : ""}
                          {cell.early_leave_minutes != null && cell.early_leave_minutes > 0
                            ? ` · Early ${formatMinutes(cell.early_leave_minutes)}`
                            : ""}
                          {cell.overtime_minutes != null && cell.overtime_minutes > 0
                            ? ` · OT ${formatMinutes(cell.overtime_minutes)}`
                            : ""}
                          {shiftStatusLabel(cell.attendance_status)
                            ? ` · ${shiftStatusLabel(cell.attendance_status)}`
                            : ""}
                        </p>
                        <IssueBadges
                          issues={cell.issues}
                          compact
                          onBadgeClick={(badge) => {
                            const punches = cell.history ?? [];
                            const seq = detectPunchSequenceIssues(punches);

                            if (badge === "duplicate_punch") {
                              onOpenIssueDetail({
                                title: "Duplicate Punch detected",
                                severity: "Info",
                                what:
                                  seq.duplicate_examples.length > 0
                                    ? `Duplicate retry detected (${seq.duplicate_examples.length} pair(s)).`
                                    : "Duplicate retry detected.",
                                why: ["Same action, same shop, same device within 15 seconds with no meaningful GPS change."],
                                recommended: [
                                  "If this was a normal retry (network/scan issue), you can ignore.",
                                  "If frequent, check device connection or staff behavior.",
                                ],
                                punches,
                              });
                              return;
                            }

                            if (badge === "suspicious_punch_sequence") {
                              onOpenIssueDetail({
                                title: "Suspicious Punch Sequence",
                                severity: "High Risk",
                                what: "Punch sequence contains patterns that are hard to explain as normal breaks or split shifts.",
                                why:
                                  seq.suspicious_reasons.length > 0
                                    ? seq.suspicious_reasons
                                    : ["Impossible or spam-like punch sequence detected."],
                                recommended: [
                                  "Open the punch log and verify the sequence against CCTV or supervisor confirmation.",
                                  "If legitimate, consider manual approval and coach staff on correct punching.",
                                ],
                                punches,
                              });
                              return;
                            }

                            if (badge === "rejected_gps") {
                              onOpenIssueDetail({
                                title: "GPS Issue: Rejected location",
                                severity: "High Risk",
                                what: "One or more punches were rejected due to location/radius checks.",
                                why: ["GPS verification failed (outside allowed radius or rejected location)."],
                                recommended: ["Verify staff location at punch time.", "Adjust shop GPS radius if too strict."],
                                punches,
                              });
                              return;
                            }

                            if (badge === "missing_clock_out") {
                              onOpenIssueDetail({
                                title: "Missing Clock Out",
                                severity: "Warning",
                                what: "Staff clocked in but did not clock out.",
                                why: ["Last accepted punch is a Clock In (no closing Clock Out)."],
                                recommended: ["Ask staff to submit a forgot punch request.", "Coach staff to always clock out."],
                                punches,
                              });
                              return;
                            }

                            if (badge === "photo_proof") {
                              onOpenIssueDetail({
                                title: "Photo Proof Required",
                                severity: "Warning",
                                what: "One or more punches required photo proof.",
                                why: ["Photo proof was requested due to policy/risk signals."],
                                recommended: ["Review the selfie/photo proof and confirm the identity."],
                                punches,
                              });
                              return;
                            }

                            if (badge === "manual_approved") {
                              onOpenIssueDetail({
                                title: "Manual Approved",
                                severity: "Info",
                                what: "One or more punches were manually approved by an admin.",
                                why: ["Admin override was applied to accept the punch."],
                                recommended: ["No action needed if approval is correct."],
                                punches,
                              });
                            }
                          }}
                        />
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
      <p className="text-xs text-slate-500">Tap a day cell to expand punch log and GPS details.</p>
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
    return (
      <p className={`${dashboardCard} px-6 py-12 text-center text-sm text-slate-500`}>
        No data in range.
      </p>
    );
  }

  return (
    <div className={dashboardTableWrap}>
      <table className="min-w-[720px] w-full text-sm">
        <thead>
          <tr>
            <th className={`${dashboardTableHead} px-4 py-3.5`}>Staff</th>
            <th className={`${dashboardTableHead} px-4 py-3.5`}>Present days</th>
            <th className={`${dashboardTableHead} px-4 py-3.5`}>Hours</th>
            <th className={`${dashboardTableHead} px-4 py-3.5`}>Log</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <Fragment key={r.staff_id}>
              <tr className={`${dashboardTableRow} ${idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"}`}>
                <td className="px-4 py-3.5">
                  <span className="font-medium text-slate-900">{labelStaff(r.staff_name, r.staff_status)}</span>
                  <div className="text-xs text-slate-500">{r.staff_code}</div>
                </td>
                <td className="px-4 py-3.5 text-slate-700">{r.present_days}</td>
                <td className="px-4 py-3.5 font-semibold text-slate-900">{r.total_hours_label}</td>
                <td className="px-4 py-3.5">
                  <button
                    type="button"
                    className="rounded-lg px-2.5 py-1 text-sm font-semibold text-[#2563EB] transition hover:bg-blue-50"
                    onClick={() => setExpanded(expanded === r.staff_id ? null : r.staff_id)}
                  >
                    {expanded === r.staff_id ? "Hide" : "Show"}
                  </button>
                </td>
              </tr>
              {expanded === r.staff_id ? (
                <tr>
                  <td colSpan={4} className="border-b border-slate-100 bg-slate-50/80 px-4 py-4">
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


"use client";

import { Fragment, useMemo } from "react";
import type { ReportSummary } from "@/lib/attendance-report";
import { IssueBadges } from "./IssueBadges";
import { PunchLogTable } from "./PunchLogTable";
import {
  averageHoursPerDayLabel,
  buildMonthDashboardSummary,
  managerIssueChips,
  monthFirstInLastOut,
  monthManualEdits,
  monthPhotoProofRows,
  monthWorkingSessionsByDay,
  rowAttention,
  staffMonthStatus,
  type MonthRowUi,
  type MonthStaffStatus,
} from "./month-report-ui";

function labelStaff(name: string, status?: string) {
  if (status === "inactive") return `${name} (inactive)`;
  return name;
}

function formatMonthTitle(monthYmd: string) {
  const [y, m] = monthYmd.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-MY", { month: "long", year: "numeric" });
}

function MonthSummaryCards({ summary }: { summary: ReturnType<typeof buildMonthDashboardSummary> }) {
  const cards = [
    { label: "Present staff", value: String(summary.presentStaff), tone: "emerald" as const },
    { label: "Total hours", value: summary.totalHoursLabel, tone: "blue" as const },
    { label: "In shop now", value: String(summary.inShopCount), tone: "emerald" as const },
    { label: "Missing punch", value: String(summary.missingPunchCount), tone: "amber" as const },
    { label: "Review required", value: String(summary.reviewRequiredCount), tone: "orange" as const },
    { label: "Late / open shifts", value: String(summary.lateIssuesCount), tone: "rose" as const },
  ];

  const toneClass = {
    emerald: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white shadow-sm dark:border-emerald-900/60 dark:from-emerald-950/50 dark:to-zinc-950",
    blue: "border-blue-200/80 bg-gradient-to-br from-blue-50 to-white shadow-sm dark:border-blue-900/60 dark:from-blue-950/50 dark:to-zinc-950",
    amber: "border-amber-200/80 bg-gradient-to-br from-amber-50 to-white shadow-sm dark:border-amber-900/60 dark:from-amber-950/40 dark:to-zinc-950",
    orange: "border-orange-200/80 bg-gradient-to-br from-orange-50 to-white shadow-sm dark:border-orange-900/60 dark:from-orange-950/40 dark:to-zinc-950",
    rose: "border-rose-200/80 bg-gradient-to-br from-rose-50 to-white shadow-sm dark:border-rose-900/60 dark:from-rose-950/40 dark:to-zinc-950",
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-2xl border px-4 py-3 ${toneClass[c.tone]}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 sm:text-xs">
            {c.label}
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

const STATUS_CONFIG: Record<
  MonthStaffStatus,
  { label: string; dot: string; className: string }
> = {
  in_shop: {
    label: "In Shop",
    dot: "🟢",
    className:
      "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300/80 dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-800",
  },
  out: {
    label: "Out",
    dot: "⚪",
    className:
      "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-300/80 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-600",
  },
  absent: {
    label: "Absent",
    dot: "🔴",
    className:
      "bg-red-100 text-red-900 ring-1 ring-red-300/80 dark:bg-red-950/50 dark:text-red-100 dark:ring-red-900",
  },
  review_needed: {
    label: "Review Needed",
    dot: "🟡",
    className:
      "bg-amber-100 text-amber-950 ring-1 ring-amber-300/80 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-800",
  },
};

function MonthStatusBadge({ status }: { status: MonthStaffStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${c.className}`}
    >
      <span aria-hidden>{c.dot}</span>
      {c.label}
    </span>
  );
}

function ManagerIssueChips({ row }: { row: MonthRowUi }) {
  const chips = managerIssueChips(row.issues, row);
  if (chips.length === 0) {
    return <span className="text-xs text-zinc-400">None</span>;
  }
  const toneClass: Record<(typeof chips)[0]["tone"], string> = {
    amber: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100",
    violet: "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-100",
    teal: "bg-teal-100 text-teal-900 dark:bg-teal-950/50 dark:text-teal-100",
    orange: "bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-100",
    red: "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100",
    rose: "bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-100",
    sky: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100",
  };
  return (
    <div className="flex max-w-[200px] flex-wrap gap-1">
      {chips.slice(0, 4).map((chip) => (
        <span
          key={chip.key}
          className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${toneClass[chip.tone]}`}
        >
          {chip.label}
        </span>
      ))}
      {chips.length > 4 ? (
        <span className="text-[10px] text-zinc-500">+{chips.length - 4}</span>
      ) : null}
    </div>
  );
}

const ROW_BORDER: Record<ReturnType<typeof rowAttention>, string> = {
  normal: "border-l-emerald-500",
  attention: "border-l-amber-500",
  critical: "border-l-red-500",
};

function MonthStaffDetail({
  row,
  month,
  daysInMonth,
}: {
  row: MonthRowUi;
  month: string;
  daysInMonth: number;
}) {
  const { firstIn, lastOut } = monthFirstInLastOut(row.history);
  const daySessions = monthWorkingSessionsByDay(row.history, month, daysInMonth);
  const manual = monthManualEdits(row.history);
  const photoProof = monthPhotoProofRows(row.history);

  return (
    <div className="space-y-5 border-t border-zinc-200/80 bg-zinc-50/80 px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-950">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">First in (month)</p>
          <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-50">{firstIn ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-950">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Last out (month)</p>
          <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-50">{lastOut ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-950">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">GPS detail</p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            Weak {row.weak_gps_count} · Rejected {row.rejected_gps_count} · Review{" "}
            {row.review_required_count}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-950">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Score (detail)</p>
          <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-50">{row.summary_score}</p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Working sessions</h4>
        {daySessions.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No completed sessions this month.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {daySessions.map((d) => (
              <li
                key={d.date}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{d.date}</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">{d.hoursLabel}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {d.firstIn ?? "—"} → {d.lastOut ?? "—"}
                </p>
                {d.sessions.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {d.sessions.map((s, i) => (
                      <li key={`${d.date}-${i}`}>
                        Session {i + 1}: {s.in} – {s.out} ({s.durationLabel})
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {manual.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Manual edits</h4>
          <PunchLogTable rows={manual} showDate />
        </div>
      ) : null}

      {photoProof.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Photo proof</h4>
          <PunchLogTable rows={photoProof} showDate />
        </div>
      ) : null}

      {row.shift_performance ? (
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Schedule vs actual</h4>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <dt className="text-zinc-500">Scheduled days</dt>
              <dd className="font-semibold">{row.shift_performance.scheduled_days}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Attended days</dt>
              <dd>{row.shift_performance.present_days}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Missed shifts</dt>
              <dd>
                {Math.max(
                  0,
                  row.shift_performance.scheduled_days - row.shift_performance.present_days,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Late count</dt>
              <dd>{row.shift_performance.late_count}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Reliability</dt>
              <dd className="font-semibold">{row.shift_performance.reliability_percent}%</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Scheduled / actual hrs</dt>
              <dd>
                {row.shift_performance.scheduled_hours_label} / {row.shift_performance.actual_hours_label}
              </dd>
            </div>
          </dl>
          {row.shift_performance.daily && row.shift_performance.daily.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-zinc-500">
                    <th className="py-1 pr-2">Date</th>
                    <th className="py-1 pr-2">Sched.</th>
                    <th className="py-1 pr-2">In</th>
                    <th className="py-1 pr-2">Out</th>
                    <th className="py-1 pr-2">Late</th>
                    <th className="py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {row.shift_performance.daily
                    .filter((d) => d.scheduled_start || d.actual_clock_in || d.status !== "off_day")
                    .slice(0, 31)
                    .map((d) => (
                      <tr key={d.date} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="py-1 pr-2">{d.date}</td>
                        <td className="py-1 pr-2">
                          {d.scheduled_start && d.scheduled_end
                            ? `${d.scheduled_start}–${d.scheduled_end}`
                            : "—"}
                        </td>
                        <td className="py-1 pr-2">{d.actual_clock_in?.slice(11, 16) ?? "—"}</td>
                        <td className="py-1 pr-2">{d.actual_clock_out?.slice(11, 16) ?? "—"}</td>
                        <td className="py-1 pr-2">{d.late_minutes > 0 ? `${d.late_minutes}m` : "—"}</td>
                        <td className="py-1 capitalize">{d.status.replace(/_/g, " ")}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <h4 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">All issue flags</h4>
        <IssueBadges issues={row.issues} />
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Attendance history</h4>
        <PunchLogTable rows={row.history} showDate />
      </div>
    </div>
  );
}

export function MonthReportView({
  month,
  daysInMonth,
  rows,
  summary,
  reportView,
  expanded,
  setExpanded,
}: {
  month: string;
  daysInMonth: number;
  rows: MonthRowUi[];
  summary: ReportSummary;
  reportView: "attendance" | "absent";
  expanded: string | null;
  setExpanded: (v: string | null) => void;
}) {
  const dashboard = useMemo(
    () => buildMonthDashboardSummary(month, rows, summary.total_hours_label),
    [month, rows, summary.total_hours_label],
  );

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40">
        No attendance this month for the current filters.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Manager overview</p>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{formatMonthTitle(month)}</h3>
        </div>
        <p className="text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Normal
          </span>
          <span className="mx-2">·</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Needs attention
          </span>
          <span className="mx-2">·</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Critical
          </span>
        </p>
      </div>

      <MonthSummaryCards summary={dashboard} />

      <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800">
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-100/90 text-xs uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <th className="px-4 py-3 font-semibold">Staff</th>
                <th className="px-3 py-3 font-semibold text-center">Present</th>
                <th className="px-3 py-3 font-semibold">Total hours</th>
                <th className="px-3 py-3 font-semibold">Avg / day</th>
                <th className="px-3 py-3 font-semibold text-center">Missing punch</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Issues</th>
                <th className="px-3 py-3 font-semibold text-center">Reliability</th>
                <th className="px-3 py-3 font-semibold text-center">Late</th>
                <th className="px-3 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const attention = rowAttention(r, month);
                const status = staffMonthStatus(r.history, month);
                const isOpen = expanded === r.staff_id;
                return (
                  <Fragment key={r.staff_id}>
                    <tr
                      className={`border-l-4 ${ROW_BORDER[attention]} odd:bg-white even:bg-zinc-50/80 dark:odd:bg-zinc-950 dark:even:bg-zinc-900/40`}
                    >
                      <td className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                          {labelStaff(r.staff_name, r.staff_status)}
                        </p>
                        <p className="text-xs text-zinc-500">{r.staff_code}</p>
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-center tabular-nums dark:border-zinc-800">
                        {r.present_days}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-3 font-semibold tabular-nums dark:border-zinc-800">
                        {r.total_hours_label}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-3 tabular-nums text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                        {averageHoursPerDayLabel(r)}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-center dark:border-zinc-800">
                        {r.missing_clock_out_days > 0 ? (
                          <span className="inline-flex min-w-[1.5rem] justify-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-950 dark:bg-amber-950/60 dark:text-amber-100">
                            {r.missing_clock_out_days}
                          </span>
                        ) : (
                          <span className="text-zinc-400">0</span>
                        )}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-3 dark:border-zinc-800">
                        <MonthStatusBadge status={status} />
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-3 dark:border-zinc-800">
                        <ManagerIssueChips row={r} />
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-center tabular-nums dark:border-zinc-800">
                        {r.shift_performance
                          ? `${r.shift_performance.reliability_percent}%`
                          : "—"}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-center tabular-nums dark:border-zinc-800">
                        {r.shift_performance?.late_count ?? "—"}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-3 text-right dark:border-zinc-800">
                        {reportView === "attendance" ? (
                          <button
                            type="button"
                            onClick={() => setExpanded(isOpen ? null : r.staff_id)}
                            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                          >
                            {isOpen ? "Close" : "Details"}
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                    {reportView === "attendance" && isOpen ? (
                      <tr>
                        <td colSpan={10} className="p-0">
                          <MonthStaffDetail row={r} month={month} daysInMonth={daysInMonth} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        Tap <strong>Details</strong> on a staff row for sessions, manual edits, photo proof, and full punch history.
        GPS score and weak-signal counts are in the detail panel only.
      </p>
    </div>
  );
}

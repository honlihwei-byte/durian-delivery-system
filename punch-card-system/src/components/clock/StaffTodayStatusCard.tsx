"use client";

import { useI18n } from "@/components/i18n/LanguageProvider";
import { translateEmployeeStatus } from "@/lib/i18n/employee-translate";
import { staffPunchLocationClassName } from "@/lib/staff-punch-display";
import type { StaffTodayStatusSummary } from "@/lib/staff-day-status";

type Props = {
  staffName: string;
  summary: StaffTodayStatusSummary | null;
  loading?: boolean;
  error?: string | null;
};

function statusBadgeClass(status: StaffTodayStatusSummary["status"]): string {
  switch (status) {
    case "in_shop":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100";
    case "out":
      return "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100";
    case "missing_clock_out":
      return "bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-100";
    default:
      return "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100";
  }
}

export function StaffTodayStatusCard({ staffName, summary, loading, error }: Props) {
  const { t } = useI18n();

  if (!staffName && !loading) return null;

  return (
    <section className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
            {t("employee.punchLog.title")}
          </p>
          <p className="mt-0.5 text-xs opacity-75">
            {summary?.day_ymd ?? t("employee.common.emDash")} · {staffName}
          </p>
        </div>
        {loading ? (
          <span className="text-xs opacity-70">{t("employee.common.updating")}</span>
        ) : summary ? (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${statusBadgeClass(summary.status)}`}
          >
            {translateEmployeeStatus(t, summary.status)}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p>
      ) : null}

      {summary && !loading ? (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div>
              <dt className="font-medium opacity-75">{t("employee.punchLog.firstIn")}</dt>
              <dd className="font-mono font-semibold">{summary.first_in ?? t("employee.common.emDash")}</dd>
            </div>
            <div>
              <dt className="font-medium opacity-75">{t("employee.punchLog.lastOut")}</dt>
              <dd className="font-mono font-semibold">{summary.last_out ?? t("employee.common.emDash")}</dd>
            </div>
            <div>
              <dt className="font-medium opacity-75">{t("employee.punchLog.hoursSoFar")}</dt>
              <dd className="font-semibold">{summary.total_hours_label}</dd>
            </div>
            <div>
              <dt className="font-medium opacity-75">{t("employee.punchLog.latestPunch")}</dt>
              <dd className="font-semibold">
                {summary.latest_action && summary.latest_time
                  ? `${translateEmployeeStatus(t, summary.latest_action)} ${summary.latest_time.slice(0, 8)}`
                  : t("employee.common.emDash")}
              </dd>
            </div>
          </dl>

          {summary.attendance_issues?.missing_punch ? (
            <p className="mt-2 rounded-lg bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
              {t("employee.punchLog.incompleteHint")}
            </p>
          ) : null}

          {summary.history.length > 0 ? (
            <div className="mt-3 border-t border-sky-200/80 pt-3 dark:border-sky-800">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                {t("employee.punchLog.todayPunchLog")}
              </p>
              <ul className="mt-2 space-y-1.5 text-xs">
                {summary.history.map((h) => (
                  <li key={h.id} className="leading-snug">
                    <span className="font-mono tabular-nums">{h.time_label}</span>{" "}
                    <span className="font-semibold">{translateEmployeeStatus(t, h.action_type)}</span>
                    <span className="text-zinc-500"> — </span>
                    <span
                      className={`font-semibold ${staffPunchLocationClassName(h.gps_status_code)}`}
                    >
                      {translateEmployeeStatus(t, h.gps_status_code)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 text-xs opacity-75">{t("employee.punchLog.noPunches")}</p>
          )}
        </>
      ) : loading && !summary ? (
        <p className="mt-3 text-xs opacity-75">{t("employee.punchLog.loading")}</p>
      ) : null}
    </section>
  );
}

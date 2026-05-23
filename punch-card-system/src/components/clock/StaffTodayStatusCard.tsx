"use client";

import { gpsStatusClassName, type GpsStatusLabel } from "@/lib/attendance";
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
  if (!staffName && !loading) return null;

  return (
    <section className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Today&apos;s Status</p>
          <p className="mt-0.5 text-xs opacity-75">{summary?.day_ymd ?? "—"} · {staffName}</p>
        </div>
        {loading ? (
          <span className="text-xs opacity-70">Updating…</span>
        ) : summary ? (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${statusBadgeClass(summary.status)}`}
          >
            {summary.status_label}
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
              <dt className="font-medium opacity-75">First in</dt>
              <dd className="font-mono font-semibold">{summary.first_in ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium opacity-75">Last out</dt>
              <dd className="font-mono font-semibold">{summary.last_out ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-medium opacity-75">Hours so far</dt>
              <dd className="font-semibold">{summary.total_hours_label}</dd>
            </div>
            <div>
              <dt className="font-medium opacity-75">Latest punch</dt>
              <dd className="font-semibold">
                {summary.latest_action_label && summary.latest_time
                  ? `${summary.latest_action_label} ${summary.latest_time.slice(0, 8)}`
                  : "—"}
              </dd>
            </div>
          </dl>
          {summary.latest_gps_status ? (
            <p className="mt-2 text-xs">
              Latest GPS:{" "}
              <span
                className={`font-semibold ${gpsStatusClassName(summary.latest_gps_status as GpsStatusLabel)}`}
              >
                {summary.latest_gps_status}
              </span>
            </p>
          ) : null}

          {summary.history.length > 0 ? (
            <div className="mt-3 border-t border-sky-200/80 pt-3 dark:border-sky-800">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Today punch log</p>
              <ul className="mt-2 space-y-1 font-mono text-xs">
                {summary.history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2">
                    <span>
                      {h.time_label} {h.action_short}
                    </span>
                    <span
                      className={`font-sans font-semibold ${gpsStatusClassName(h.gps_status as GpsStatusLabel)}`}
                    >
                      {h.gps_status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 text-xs opacity-75">No punches recorded today at this shop yet.</p>
          )}
        </>
      ) : loading && !summary ? (
        <p className="mt-3 text-xs opacity-75">Loading today&apos;s attendance…</p>
      ) : null}
    </section>
  );
}

import type { ReportSummary } from "@/lib/attendance-report";
import { dashboardCard } from "./dashboard-ui";

type Props = {
  summary: ReportSummary;
  subtitle?: string;
};

const METRICS = [
  { key: "present", label: "Present", color: "#2563EB", get: (s: ReportSummary) => s.total_present_staff },
  { key: "hours", label: "Hours (h)", color: "#6366F1", get: (s: ReportSummary) => Math.round(s.total_hours_ms / 3600000) },
  { key: "missing", label: "Missing out", color: "#F59E0B", get: (s: ReportSummary) => s.missing_clock_out_count },
  { key: "gps", label: "GPS issues", color: "#EF4444", get: (s: ReportSummary) => s.gps_issues_count },
  { key: "review", label: "Review", color: "#F97316", get: (s: ReportSummary) => s.review_required_count },
] as const;

export function AttendanceSummaryChart({ summary, subtitle }: Props) {
  const values = METRICS.map((m) => ({ ...m, value: m.get(summary) }));
  const max = Math.max(1, ...values.map((v) => v.value));

  return (
    <section className={`${dashboardCard} p-6`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Attendance summary</h3>
          <p className="mt-1 text-sm font-normal text-slate-500">
            {subtitle ?? "Overview for the current filters and date range"}
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-end justify-between gap-3 sm:gap-6" style={{ minHeight: 160 }}>
        {values.map((item) => {
          const pct = Math.max(8, (item.value / max) * 100);
          return (
            <div key={item.key} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-sm font-semibold tabular-nums text-slate-900">{item.value}</span>
              <div className="flex w-full max-w-[72px] flex-col justify-end" style={{ height: 120 }}>
                <div
                  className="w-full rounded-t-xl transition-all duration-500"
                  style={{
                    height: `${pct}%`,
                    backgroundColor: item.color,
                    opacity: item.value === 0 ? 0.25 : 1,
                  }}
                  title={`${item.label}: ${item.value}`}
                />
              </div>
              <span className="text-center text-[11px] font-medium leading-tight text-slate-500">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

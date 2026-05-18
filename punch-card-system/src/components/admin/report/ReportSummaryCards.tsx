import type { ReportSummary } from "@/lib/attendance-report";

export function ReportSummaryCards({ summary }: { summary: ReportSummary }) {
  const cards = [
    { label: "Present staff", value: String(summary.total_present_staff), tone: "emerald" },
    { label: "Total hours", value: summary.total_hours_label, tone: "blue" },
    { label: "Missing clock out", value: String(summary.missing_clock_out_count), tone: "amber" },
    { label: "GPS issues", value: String(summary.gps_issues_count), tone: "orange" },
    { label: "Review required", value: String(summary.review_required_count), tone: "orange" },
  ] as const;

  const toneClass: Record<(typeof cards)[number]["tone"], string> = {
    emerald: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
    blue: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40",
    amber: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
    orange: "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/40",
  };

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-xl border px-3 py-2.5 ${toneClass[c.tone]}`}
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs">
            {c.label}
          </p>
          <p className="mt-0.5 text-lg font-bold text-zinc-900 dark:text-zinc-50">{c.value}</p>
        </div>
      ))}
    </div>
  );
}


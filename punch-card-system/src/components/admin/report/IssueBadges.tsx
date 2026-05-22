import { ISSUE_BADGE_LABELS, type DayIssueStats, type IssueBadgeType } from "@/lib/attendance-report";

const BADGE_STYLES: Record<IssueBadgeType, string> = {
  missing_clock_out: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100",
  weak_indoor: "bg-yellow-100 text-yellow-900 dark:bg-yellow-950/50 dark:text-yellow-100",
  review_required: "bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-100",
  rejected_gps: "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100",
  photo_proof: "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-100",
};

export function IssueBadges({ issues, compact }: { issues: DayIssueStats; compact?: boolean }) {
  if (issues.issue_count === 0) {
    return <span className="text-zinc-400">—</span>;
  }

  return (
    <div className={`flex flex-wrap gap-1 ${compact ? "" : "max-w-[220px]"}`}>
      {issues.badges.map((b) => (
        <span
          key={b}
          className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight sm:text-xs ${BADGE_STYLES[b]}`}
        >
          {compact
            ? ISSUE_BADGE_LABELS[b].replace(" GPS", "").replace(" clock out", "")
            : ISSUE_BADGE_LABELS[b]}
        </span>
      ))}
    </div>
  );
}

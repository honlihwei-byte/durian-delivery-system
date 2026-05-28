import { ISSUE_BADGE_LABELS, type DayIssueStats, type IssueBadgeType } from "@/lib/attendance-report";

const BADGE_STYLES: Record<IssueBadgeType, string> = {
  missing_clock_out: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100",
  missing_clock_in: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100",
  missing_punch: "bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-100",
  weak_indoor: "bg-yellow-100 text-yellow-900 dark:bg-yellow-950/50 dark:text-yellow-100",
  expanded_radius: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100",
  review_required: "bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-100",
  rejected_gps: "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100",
  photo_proof: "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-100",
  manual_approved: "bg-teal-100 text-teal-900 dark:bg-teal-950/50 dark:text-teal-100",
  duplicate_prevented: "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-950/50 dark:text-fuchsia-100",
  duplicate_punch: "bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-100",
  suspicious_punch_sequence: "bg-orange-100 text-orange-950 dark:bg-orange-950/50 dark:text-orange-100",
  trusted_device: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
  new_device: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100",
  buddy_punch: "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100",
  random_selfie: "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-950/50 dark:text-fuchsia-100",
  high_risk: "bg-rose-200 text-rose-950 dark:bg-rose-950/60 dark:text-rose-100",
};

export function IssueBadges({ issues, compact }: { issues: DayIssueStats; compact?: boolean }) {
  const allowed = new Set<IssueBadgeType>([
    "missing_clock_in",
    "missing_clock_out",
    "rejected_gps",
    "review_required",
    "photo_proof",
    "high_risk",
    "new_device",
    "buddy_punch",
  ]);
  const badges = issues.badges.filter((b) => allowed.has(b));

  if (badges.length === 0) {
    return <span className="text-zinc-400">—</span>;
  }

  return (
    <div className={`flex flex-wrap gap-1 ${compact ? "" : "max-w-[220px]"}`}>
      {badges.map((b) => (
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

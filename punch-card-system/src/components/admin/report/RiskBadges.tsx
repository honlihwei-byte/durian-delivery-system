import {
  RISK_BADGE_LABELS,
  type RiskBadgeType,
} from "@/lib/attendance-risk-badges";

const STYLES: Record<RiskBadgeType, string> = {
  trusted_device: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
  new_device: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100",
  device_mismatch: "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100",
  buddy_punch: "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100",
  random_selfie: "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-950/50 dark:text-fuchsia-100",
  selfie_proof: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100",
  high_risk: "bg-rose-200 text-rose-950 dark:bg-rose-950/60 dark:text-rose-100",
};

export function RiskBadges({
  badges,
  compact,
}: {
  badges: RiskBadgeType[];
  compact?: boolean;
}) {
  if (badges.length === 0) return null;
  return (
    <span className={`inline-flex flex-wrap gap-1 ${compact ? "" : "mt-1"}`}>
      {badges.map((b) => (
        <span
          key={b}
          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STYLES[b]}`}
        >
          {RISK_BADGE_LABELS[b]}
        </span>
      ))}
    </span>
  );
}

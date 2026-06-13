import { malaysiaDateYmd } from "@/lib/malaysia-time";

export type OperationsLifecycleStatus = "upcoming" | "active" | "ended";

export function opsContentLifecycleStatus(
  row: { effective_date: string; end_date: string | null },
  day: string = malaysiaDateYmd(new Date()),
): OperationsLifecycleStatus {
  if (row.effective_date > day) return "upcoming";
  if (row.end_date && row.end_date < day) return "ended";
  return "active";
}

export function isOpsContentActiveOnDate(
  row: { effective_date: string; end_date: string | null },
  day: string,
): boolean {
  return opsContentLifecycleStatus(row, day) === "active";
}

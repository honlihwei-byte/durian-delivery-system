export type PayrollMode = "actual_hours" | "scheduled_hours";

export const PAYROLL_MODE_LABELS: Record<PayrollMode, string> = {
  actual_hours: "Actual hours (punch in/out)",
  scheduled_hours: "Scheduled hours (recommended)",
};

export function normalizePayrollMode(value: unknown): PayrollMode {
  return value === "actual_hours" ? "actual_hours" : "scheduled_hours";
}

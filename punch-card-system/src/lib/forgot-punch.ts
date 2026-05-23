export const FORGOT_PUNCH_REASONS = [
  { value: "forgot_to_punch", label: "Forgot to punch" },
  { value: "phone_issue", label: "Phone issue" },
  { value: "gps_issue", label: "GPS issue" },
  { value: "other", label: "Other" },
] as const;

export type ForgotPunchReason = (typeof FORGOT_PUNCH_REASONS)[number]["value"];
export type ForgotPunchRequestType = "forgot_clock_in" | "forgot_clock_out";
export type ForgotPunchStatus = "pending" | "approved" | "rejected";

export type ForgotPunchRequestRow = {
  id: string;
  staff_id: string;
  shop_id: string;
  request_type: ForgotPunchRequestType;
  requested_time: string;
  reason: ForgotPunchReason;
  notes: string | null;
  status: ForgotPunchStatus;
  attendance_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  audit_old_json: unknown;
  audit_new_json: unknown;
  created_at: string;
};

export function forgotPunchTypeLabel(t: ForgotPunchRequestType): string {
  return t === "forgot_clock_in" ? "Forgot Clock In" : "Forgot Clock Out";
}

export function forgotPunchStatusLabel(s: ForgotPunchStatus): string {
  if (s === "approved") return "Approved";
  if (s === "rejected") return "Rejected";
  return "Pending";
}

export function parseForgotPunchReason(v: string): ForgotPunchReason | null {
  return FORGOT_PUNCH_REASONS.some((r) => r.value === v) ? (v as ForgotPunchReason) : null;
}

export function parseForgotPunchRequestType(v: string): ForgotPunchRequestType | null {
  return v === "forgot_clock_in" || v === "forgot_clock_out" ? v : null;
}

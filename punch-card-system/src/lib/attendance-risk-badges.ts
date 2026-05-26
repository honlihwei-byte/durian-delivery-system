import type { AttendanceRecord } from "@/lib/attendance";
import { parseRiskFlagsJson, type RiskFlag } from "@/lib/punch-risk";
import { isRandomSelfieMethod } from "@/lib/verification-method";

export type RiskBadgeType =
  | "trusted_device"
  | "new_device"
  | "buddy_punch"
  | "random_selfie"
  | "high_risk";

export const RISK_BADGE_LABELS: Record<RiskBadgeType, string> = {
  trusted_device: "Trusted Device",
  new_device: "New Device",
  buddy_punch: "Potential Buddy Punch",
  random_selfie: "Random Selfie",
  high_risk: "High Risk",
};

export function riskBadgesForRecord(record: AttendanceRecord): RiskBadgeType[] {
  const badges: RiskBadgeType[] = [];
  const flags = parseRiskFlagsJson(record.risk_flags);

  if (record.device_trust_status === "trusted") badges.push("trusted_device");
  if (flags.includes("new_device") || record.device_trust_status === "new_device") {
    badges.push("new_device");
  }
  if (record.buddy_punch_flag || flags.includes("buddy_punch")) {
    badges.push("buddy_punch");
  }
  if (flags.includes("random_selfie") || isRandomSelfieMethod(record.verification_method)) {
    badges.push("random_selfie");
  }
  if (record.risk_level === "high" || (record.risk_score ?? 0) >= 61) {
    badges.push("high_risk");
  }

  return [...new Set(badges)];
}

export function riskBadgesForRows(rows: AttendanceRecord[]): RiskBadgeType[] {
  const set = new Set<RiskBadgeType>();
  for (const r of rows) {
    for (const b of riskBadgesForRecord(r)) set.add(b);
  }
  return [...set];
}

export function riskFlagsForRows(rows: AttendanceRecord[]): RiskFlag[] {
  const set = new Set<RiskFlag>();
  for (const r of rows) {
    for (const f of parseRiskFlagsJson(r.risk_flags)) set.add(f);
  }
  return [...set];
}

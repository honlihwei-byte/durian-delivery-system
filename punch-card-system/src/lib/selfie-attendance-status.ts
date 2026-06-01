import type { AttendanceRecord } from "@/lib/attendance";
import { isSelfieProofMethod } from "@/lib/verification-method";

export type SelfieAttendanceStatus =
  | "none"
  | "pending_upload"
  | "attached"
  | "verified";

export function selfieStatusForRecord(
  record: Pick<
    AttendanceRecord,
    | "selfie_proof_used"
    | "selfie_proof_path"
    | "selfie_captured_at"
    | "verification_method"
    | "audit_notes"
  >,
): SelfieAttendanceStatus {
  if (record.selfie_proof_path) {
    if (record.selfie_proof_used || isSelfieProofMethod(record.verification_method)) {
      return "verified";
    }
    return "attached";
  }
  if (record.selfie_captured_at) return "pending_upload";
  if (/selfie.*pending/i.test(record.audit_notes ?? "")) return "pending_upload";
  return "none";
}

export function selfieStatusLabel(status: SelfieAttendanceStatus): string {
  switch (status) {
    case "verified":
      return "Selfie verified";
    case "attached":
      return "Selfie on file";
    case "pending_upload":
      return "Selfie pending upload";
    default:
      return "No selfie";
  }
}

export function hasSelfieOnRecord(
  record: Pick<AttendanceRecord, "selfie_proof_path" | "selfie_captured_at">,
): boolean {
  return Boolean(record.selfie_proof_path || record.selfie_captured_at);
}

import { gpsStatusLabel, type AttendanceRecord, type GpsStatusLabel } from "@/lib/attendance";
import {
  isPhotoProofMethod,
  isRandomSelfieMethod,
} from "@/lib/verification-method";

/** Staff-facing location labels (no technical GPS wording). */
export const STAFF_LOCATION_APPROVED = "Location approved";
export const STAFF_PHOTO_PROOF_SUBMITTED = "Photo proof submitted";
export const STAFF_LOCATION_UNAVAILABLE = "Location not available. Please retry.";

export function formatPunchSubmittedToast(actionType: "clock_in" | "clock_out"): string {
  return actionType === "clock_in" ? "Clock In submitted" : "Clock Out submitted";
}

export function staffPunchLocationLabelFromTechnical(technical: GpsStatusLabel | string): string {
  switch (technical) {
    case "Rejected":
    case "Location not available":
      return STAFF_LOCATION_UNAVAILABLE;
    case "Photo Proof":
      return STAFF_PHOTO_PROOF_SUBMITTED;
    case "Verified":
    case "Weak Indoor":
    case "Expanded Radius":
    case "Review Required":
    case "Manual Approved":
      return STAFF_LOCATION_APPROVED;
    default:
      return STAFF_LOCATION_APPROVED;
  }
}

export function staffPunchLocationLabelFromRecord(
  record: Pick<
    AttendanceRecord,
    | "photo_proof_used"
    | "verification_method"
    | "gps_verified"
    | "gps_verify_tier"
    | "staff_latitude"
    | "staff_longitude"
    | "gps_indoor_fallback_used"
    | "review_required"
  >,
): string {
  if (
    record.photo_proof_used ||
    isPhotoProofMethod(record.verification_method) ||
    isRandomSelfieMethod(record.verification_method)
  ) {
    return STAFF_PHOTO_PROOF_SUBMITTED;
  }
  return staffPunchLocationLabelFromTechnical(gpsStatusLabel(record as AttendanceRecord));
}

export function staffPunchLocationClassName(label: string): string {
  if (label === STAFF_PHOTO_PROOF_SUBMITTED) {
    return "text-violet-700 dark:text-violet-300";
  }
  if (label === STAFF_LOCATION_UNAVAILABLE) {
    return "text-red-700 dark:text-red-300";
  }
  return "text-teal-700 dark:text-teal-300";
}

export function staffClockActionLabel(actionType: "clock_in" | "clock_out"): string {
  return actionType === "clock_in" ? "Clock In" : "Clock Out";
}

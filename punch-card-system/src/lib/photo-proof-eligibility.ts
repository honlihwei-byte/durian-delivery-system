import type { ClockGpsVerifySnapshot } from "@/lib/clock-verified-gps";

export function canShowPhotoProofOption(
  allowPhotoProofFallback: boolean,
  snap: ClockGpsVerifySnapshot,
  gpsVerifiedForPunch: boolean,
): boolean {
  if (!allowPhotoProofFallback) return false;
  if (gpsVerifiedForPunch) return false;
  if (snap.isCheckingLocation || snap.phase === "checking") return false;
  return true;
}

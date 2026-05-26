"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getClockGpsVerifyServerSnapshot,
  getClockGpsVerifySnapshot,
  refreshClockGpsVerification,
  subscribeClockGpsVerify,
} from "@/lib/clock-verified-gps";
import { GPS_CHECKING_TIMEOUT_MSG, GPS_UNAVAILABLE_MSG } from "@/lib/geolocation-client";
import { STAFF_LOCATION_APPROVED, STAFF_LOCATION_UNAVAILABLE } from "@/lib/staff-punch-display";

function cardTone(
  canPunch: boolean,
  phase: string,
  errorMessage: string | null,
): "approved" | "retry" | "checking" {
  if (canPunch) return "approved";
  if (
    phase === "error" ||
    phase === "too_far" ||
    (errorMessage && errorMessage !== GPS_UNAVAILABLE_MSG)
  ) {
    return "retry";
  }
  return "checking";
}

function cardStyles(tone: "approved" | "retry" | "checking"): string {
  switch (tone) {
    case "approved":
      return "border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100";
    case "retry":
      return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200";
    default:
      return "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100";
  }
}

function badgeClass(tone: "approved" | "retry" | "checking"): string {
  switch (tone) {
    case "approved":
      return "border-teal-300/60 bg-teal-100/80 text-teal-900 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-100";
    case "retry":
      return "border-red-300/60 bg-red-100/80 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100";
    default:
      return "border-blue-300/60 bg-blue-100/80 text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100";
  }
}

function staffHeadline(
  canPunch: boolean,
  isAcquiring: boolean,
  phase: string,
  errorMessage: string | null,
): string {
  if (errorMessage === GPS_CHECKING_TIMEOUT_MSG) {
    return "Still checking your location…";
  }
  if (canPunch) return STAFF_LOCATION_APPROVED;
  if (isAcquiring) return "Checking your location…";
  if (phase === "too_far" || phase === "error") return STAFF_LOCATION_UNAVAILABLE;
  return "Checking your location…";
}

function staffSubline(
  canPunch: boolean,
  isAcquiring: boolean,
  phase: string,
): string {
  if (canPunch) return "You can clock in or clock out now.";
  if (isAcquiring) return "Allow location permission on your phone.";
  if (phase === "too_far" || phase === "error") {
    return "Move closer to the shop and tap Refresh Location.";
  }
  return "Allow location permission on your phone.";
}

/** Staff clock page — friendly location status (no technical GPS labels). */
export function LocationStatusCard({
  indoorAttemptLabel: _indoorAttemptLabel,
}: {
  indoorAttemptLabel?: string | null;
}) {
  const snap = useSyncExternalStore(
    subscribeClockGpsVerify,
    getClockGpsVerifySnapshot,
    getClockGpsVerifyServerSnapshot,
  );

  const {
    phase,
    error,
    isCheckingLocation,
    confidenceDisplayLabel,
    indoorFallbackUsed,
    indoorConfidenceMode,
  } = snap;

  const label = confidenceDisplayLabel;
  const canPunch = indoorConfidenceMode
    ? indoorFallbackUsed ||
      (label != null &&
        (label === "Good" || label === "Fair") &&
        (snap.locationConfidenceScore == null || snap.locationConfidenceScore >= 60))
    : phase === "verified" || phase === "weak_indoor";
  const isAcquiring = (isCheckingLocation || phase === "checking") && !canPunch;
  const actionDisabled = isCheckingLocation && canPunch;
  const tone = cardTone(canPunch, phase, error);

  const handleAction = useCallback(() => {
    if (actionDisabled) return;
    void refreshClockGpsVerification();
  }, [actionDisabled]);

  return (
    <section
      className={`rounded-xl border px-4 py-3 text-sm ${cardStyles(tone)}`}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{staffHeadline(canPunch, isAcquiring, phase, error)}</p>
          <p className="mt-1 text-xs opacity-90">{staffSubline(canPunch, isAcquiring, phase)}</p>
        </div>
        {!isAcquiring ? (
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${badgeClass(tone)}`}
          >
            {canPunch ? STAFF_LOCATION_APPROVED : tone === "retry" ? "Retry" : "Checking"}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        disabled={actionDisabled}
        onClick={handleAction}
        className={`mt-3 w-full rounded-lg border px-3 py-2.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed ${
          canPunch
            ? "border-teal-600/40 bg-teal-600/10 text-teal-800 dark:text-teal-100"
            : "border-current/30 bg-white/60 hover:bg-white/90 dark:bg-black/20 dark:hover:bg-black/30"
        } disabled:opacity-60`}
      >
        {isAcquiring ? "Getting location…" : "Refresh Location"}
      </button>
    </section>
  );
}

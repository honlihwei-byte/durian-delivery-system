"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getClockGpsVerifyServerSnapshot,
  getClockGpsVerifySnapshot,
  refreshClockGpsVerification,
  subscribeClockGpsVerify,
} from "@/lib/clock-verified-gps";
import {
  indoorFallbackExpandedRadiusMsg,
  INDOOR_FALLBACK_ACTIVATED_MSG,
  INDOOR_FALLBACK_FAIL_MSG,
} from "@/lib/gps-indoor-fallback";
import {
  GPS_CHECKING_TIMEOUT_MSG,
  GPS_INDOOR_HINT,
  GPS_UNAVAILABLE_MSG,
} from "@/lib/geolocation-client";
import {
  confidenceUiLabel,
  type ConfidenceDisplayLabel,
} from "@/lib/location-confidence";

function confidenceStyles(label: ConfidenceDisplayLabel | null, phase: string): string {
  if (phase === "error" || label === "Rejected") {
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200";
  }
  if (label === "Good") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100";
  }
  if (label === "Fair") {
    return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100";
  }
  if (label === "Weak") {
    return "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-100";
  }
  return "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100";
}

function headline(
  isAcquiring: boolean,
  label: ConfidenceDisplayLabel | null,
  errorMessage: string | null,
  indoorConfidenceMode: boolean,
  phase: string,
): string {
  if (errorMessage === GPS_CHECKING_TIMEOUT_MSG) return GPS_CHECKING_TIMEOUT_MSG;
  if (errorMessage && errorMessage !== GPS_UNAVAILABLE_MSG) return errorMessage;
  if (isAcquiring) return "Getting location…";
  if (!indoorConfidenceMode) {
    if (phase === "verified" || phase === "weak_indoor") return "Location verified";
    if (phase === "too_far") return "Outside shop range";
    if (phase === "error") return errorMessage ?? "Location unavailable";
    return "Checking location…";
  }
  if (label) return `Location confidence: ${confidenceUiLabel(label)}`;
  return "Getting location…";
}

export function LocationStatusCard({
  indoorAttemptLabel,
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
    tooFarMessage,
    verifiedViaLabel,
    distanceMeters,
    accuracyMeters,
    isCheckingLocation,
    sampleSpreadMeters,
    locationConfidenceScore,
    confidenceDisplayLabel,
    indoorFallbackUsed,
    verifyStatusLabel,
    gpsOriginalRadiusM,
    gpsExpandedRadiusM,
    gpsTrustedWindowUsed,
    indoorConfidenceMode,
  } = snap;

  const label = confidenceDisplayLabel;
  const canPunch = indoorConfidenceMode
    ? indoorFallbackUsed ||
      (label != null &&
        (label === "Good" || label === "Fair") &&
        (locationConfidenceScore == null || locationConfidenceScore >= 60))
    : phase === "verified" || phase === "weak_indoor";
  const isAcquiring = (isCheckingLocation || phase === "checking") && !canPunch;

  const actionDisabled = isCheckingLocation && canPunch;

  const handleAction = useCallback(() => {
    if (actionDisabled) return;
    void refreshClockGpsVerification();
  }, [actionDisabled]);

  const hasMetrics =
    distanceMeters != null &&
    accuracyMeters != null &&
    Number.isFinite(distanceMeters) &&
    Number.isFinite(accuracyMeters);

  const subline = isAcquiring
    ? indoorConfidenceMode
      ? GPS_INDOOR_HINT
      : "Allow location permission to verify you are at this shop."
    : error && error !== GPS_UNAVAILABLE_MSG
      ? error
      : tooFarMessage
        ? tooFarMessage
        : hasMetrics
          ? indoorConfidenceMode
            ? `Score ${locationConfidenceScore ?? "—"}/100 · ~${Math.round(accuracyMeters ?? 0)} m accuracy · ${Math.round(distanceMeters ?? 0)} m from point · ${snap.sampleCount} sample(s)${sampleSpreadMeters > 0 ? ` · spread ${Math.round(sampleSpreadMeters)} m` : ""}${indoorFallbackUsed && gpsOriginalRadiusM != null && gpsExpandedRadiusM != null ? ` · radius ${Math.round(gpsOriginalRadiusM)}→${Math.round(gpsExpandedRadiusM)} m` : ""}`
            : `~${Math.round(accuracyMeters ?? 0)} m accuracy · ${Math.round(distanceMeters ?? 0)} m from shop point`
          : verifiedViaLabel ?? "Allow location permission to verify you are at this shop.";

  return (
    <section
      className={`rounded-xl border px-4 py-3 text-sm ${confidenceStyles(label, phase)}`}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">
            {headline(isAcquiring, label, error, indoorConfidenceMode, phase)}
          </p>
          <p className="mt-1 text-xs opacity-90">{subline}</p>
          {indoorAttemptLabel ? (
            <p className="mt-2 rounded-md bg-black/10 px-2 py-1 text-xs font-semibold dark:bg-white/10">
              {indoorAttemptLabel}
            </p>
          ) : null}
          {indoorConfidenceMode && !canPunch && tooFarMessage === INDOOR_FALLBACK_FAIL_MSG ? (
            <p className="mt-2 text-xs font-medium opacity-95">
              {INDOOR_FALLBACK_ACTIVATED_MSG}
              {gpsExpandedRadiusM != null ? (
                <>
                  <br />
                  {indoorFallbackExpandedRadiusMsg(gpsExpandedRadiusM)}
                </>
              ) : null}
            </p>
          ) : null}
          {indoorConfidenceMode && canPunch && indoorFallbackUsed && gpsExpandedRadiusM != null ? (
            <p className="mt-2 text-xs font-medium opacity-95">
              {INDOOR_FALLBACK_ACTIVATED_MSG}
              <br />
              {indoorFallbackExpandedRadiusMsg(gpsExpandedRadiusM)}
              {gpsTrustedWindowUsed ? (
                <>
                  <br />
                  Trusted device window (30 min) in use.
                </>
              ) : null}
              <br />
              {verifyStatusLabel ?? "Weak Indoor / Expanded Radius"} — punch allowed and logged for audit.
            </p>
          ) : null}
          {indoorConfidenceMode && canPunch && label === "Fair" && !indoorFallbackUsed ? (
            <p className="mt-2 text-xs font-medium opacity-95">
              Indoor GPS is fair — punch is allowed and logged for audit.
            </p>
          ) : null}
          {label === "Weak" ? (
            <p className="mt-2 text-xs font-medium opacity-95">
              Confidence is low — move closer or tap Refresh Location before punching.
            </p>
          ) : null}
        </div>
        {!isAcquiring &&
        indoorConfidenceMode &&
        (verifyStatusLabel || (label && label !== "Rejected")) ? (
          <span className="shrink-0 rounded-full border border-current/30 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide">
            {verifyStatusLabel ?? confidenceUiLabel(label!)}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        disabled={actionDisabled}
        onClick={handleAction}
        className={`mt-3 w-full rounded-lg border px-3 py-2.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed ${
          canPunch
            ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-800 dark:text-emerald-100"
            : "border-current/30 bg-white/60 hover:bg-white/90 dark:bg-black/20 dark:hover:bg-black/30"
        } disabled:opacity-60`}
      >
        {isAcquiring
          ? "Getting location…"
          : canPunch
            ? "Refresh Location"
            : "Refresh Location"}
      </button>
    </section>
  );
}

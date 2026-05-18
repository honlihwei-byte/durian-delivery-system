"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getClockGpsVerifyServerSnapshot,
  getClockGpsVerifySnapshot,
  refreshClockGpsVerification,
  shouldOfferLocationRefresh,
  subscribeClockGpsVerify,
} from "@/lib/clock-verified-gps";
import {
  GPS_INDOOR_HINT,
  GPS_UNAVAILABLE_MSG,
  GPS_UNSTABLE_HINT,
  GPS_WEAK_HINT,
  GPS_WEAK_INDOOR_HINT,
  gpsAccuracyTier,
  gpsAccuracyTierLabel,
} from "@/lib/geolocation-client";

function tierStyles(
  tier: ReturnType<typeof gpsAccuracyTier>,
  phase: string,
): string {
  if (phase === "error" || phase === "too_far") {
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200";
  }
  if (phase === "unstable") {
    return "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-100";
  }
  if (phase === "weak_indoor") {
    return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100";
  }
  switch (tier) {
    case "good":
      return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100";
    case "fair":
      return "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100";
    case "weak":
      return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100";
    default:
      return "border-zinc-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100";
  }
}

function statusTitle(
  phase: string,
  isCheckingLocation: boolean,
  verifiedViaLabel: string | null,
  reviewRequired: boolean,
): string {
  if (phase === "error") return GPS_UNAVAILABLE_MSG;
  if (isCheckingLocation || phase === "checking") return "Checking location…";
  switch (phase) {
    case "verified":
      return verifiedViaLabel ?? "Location verified, ready to punch";
    case "weak_indoor":
      return reviewRequired
        ? "Indoor location OK — review flagged"
        : (verifiedViaLabel ?? "Indoor location verified");
    case "unstable":
      return "GPS unstable — try refresh";
    case "too_far":
      return "Too far from shop";
    default:
      return "Checking location…";
  }
}

function statusBadge(phase: string, tier: ReturnType<typeof gpsAccuracyTier>): string {
  if (phase === "weak_indoor") return "Weak indoor";
  if (phase === "verified") return gpsAccuracyTierLabel(tier);
  if (phase === "unstable") return "Unstable";
  return "…";
}

function actionButtonLabel(
  phase: string,
  isCheckingLocation: boolean,
  canPunch: boolean,
): string {
  if (isCheckingLocation || phase === "checking") return "Checking…";
  if (phase === "error" || phase === "too_far" || phase === "unstable") return "Refresh Location";
  if (canPunch && phase === "weak_indoor") return "Refresh Location";
  if (canPunch) return "Location Verified";
  return "Refresh Location";
}

export function LocationStatusCard() {
  const snap = useSyncExternalStore(
    subscribeClockGpsVerify,
    getClockGpsVerifySnapshot,
    getClockGpsVerifyServerSnapshot,
  );

  const {
    phase,
    error,
    tooFarMessage,
    verified,
    verifiedViaLabel,
    distanceMeters,
    accuracyMeters,
    isCheckingLocation,
    reviewRequired,
    sampleSpreadMeters,
  } = snap;
  const tier = gpsAccuracyTier(accuracyMeters);
  const canPunch = phase === "verified" || phase === "weak_indoor";
  const isTooFar = phase === "too_far";
  const isUnstable = phase === "unstable";
  const isFailed = phase === "error";
  const isWeakIndoor = phase === "weak_indoor";
  const isChecking = isCheckingLocation || (phase === "checking" && !isFailed);

  const showActionButton =
    shouldOfferLocationRefresh(snap) || isCheckingLocation || isFailed || isTooFar || isUnstable;

  const actionDisabled =
    isCheckingLocation || isChecking || (canPunch && !isWeakIndoor && !isUnstable);

  const handleAction = useCallback(() => {
    if (actionDisabled) return;
    void refreshClockGpsVerification();
  }, [actionDisabled]);

  const hasMetrics =
    distanceMeters != null &&
    accuracyMeters != null &&
    Number.isFinite(distanceMeters) &&
    Number.isFinite(accuracyMeters);

  const subline = isFailed
    ? error && error !== GPS_UNAVAILABLE_MSG
      ? error
      : GPS_INDOOR_HINT
    : isTooFar
      ? (tooFarMessage ?? "Move closer to a verification point, then tap Refresh Location.")
      : isUnstable
        ? GPS_UNSTABLE_HINT
        : canPunch || hasMetrics
          ? `~${Math.round(accuracyMeters ?? 0)} m accuracy · ${Math.round(distanceMeters ?? 0)} m from point · ${snap.sampleCount} sample(s)${sampleSpreadMeters > 0 ? ` · spread ${Math.round(sampleSpreadMeters)} m` : ""}`
          : isChecking
            ? GPS_INDOOR_HINT
            : "Allow location permission — we verify you are at this shop before punching";

  return (
    <section
      className={`rounded-xl border px-4 py-3 text-sm ${tierStyles(tier, phase)}`}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">
            {statusTitle(phase, isCheckingLocation, verifiedViaLabel, reviewRequired)}
          </p>
          <p className="mt-1 text-xs opacity-90">{subline}</p>
          {isWeakIndoor && !isFailed ? (
            <p className="mt-2 text-xs font-medium opacity-95">
              {reviewRequired ? GPS_WEAK_HINT : GPS_WEAK_INDOOR_HINT}
            </p>
          ) : null}
        </div>
        {!isFailed && !isTooFar && !isChecking ? (
          <span className="shrink-0 rounded-full border border-current/30 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide">
            {canPunch ? statusBadge(phase, tier) : "…"}
          </span>
        ) : null}
      </div>

      {showActionButton ? (
        <button
          type="button"
          disabled={actionDisabled}
          onClick={handleAction}
          className={`mt-3 w-full rounded-lg border px-3 py-2.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed ${
            canPunch && !isWeakIndoor
              ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-800 dark:text-emerald-100"
              : "border-current/30 bg-white/60 hover:bg-white/90 dark:bg-black/20 dark:hover:bg-black/30"
          } disabled:opacity-60`}
        >
          {actionButtonLabel(phase, isCheckingLocation, canPunch)}
        </button>
      ) : null}
    </section>
  );
}

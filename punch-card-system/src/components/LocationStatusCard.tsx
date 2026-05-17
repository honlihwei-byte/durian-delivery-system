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
  GPS_WEAK_HINT,
  gpsAccuracyTier,
  gpsAccuracyTierLabel,
} from "@/lib/geolocation-client";

function tierStyles(
  tier: ReturnType<typeof gpsAccuracyTier>,
  isError: boolean,
  isTooFar: boolean,
): string {
  if (isError || isTooFar) {
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200";
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

function statusTitle(phase: string, isCheckingLocation: boolean): string {
  if (phase === "error") return GPS_UNAVAILABLE_MSG;
  if (isCheckingLocation || phase === "checking") return "Checking location…";
  switch (phase) {
    case "verified":
      return "Location verified, ready to punch";
    case "too_far":
      return "Too far from shop";
    default:
      return "Checking location…";
  }
}

function actionButtonLabel(
  phase: string,
  isCheckingLocation: boolean,
  isVerified: boolean,
  tier: ReturnType<typeof gpsAccuracyTier>,
): string {
  if (isCheckingLocation || phase === "checking") return "Checking…";
  if (phase === "error") return "Try Again";
  if (isVerified && tier !== "weak") return "Location Verified";
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
    distanceMeters,
    accuracyMeters,
    isCheckingLocation,
  } = snap;
  const tier = gpsAccuracyTier(accuracyMeters);
  const isVerified = phase === "verified" && !!verified;
  const isTooFar = phase === "too_far";
  const isFailed = phase === "error";
  const weak = tier === "weak";
  const isChecking = isCheckingLocation || (phase === "checking" && !isFailed);

  const showActionButton =
    shouldOfferLocationRefresh(snap) ||
    isCheckingLocation ||
    isFailed ||
    (isVerified && weak);

  const actionDisabled = isCheckingLocation || isChecking || (isVerified && !weak);

  const handleAction = useCallback(() => {
    if (actionDisabled) return;
    void refreshClockGpsVerification();
  }, [actionDisabled]);

  const hasMetrics =
    distanceMeters != null &&
    accuracyMeters != null &&
    Number.isFinite(distanceMeters) &&
    Number.isFinite(accuracyMeters);

  return (
    <section
      className={`rounded-xl border px-4 py-3 text-sm ${tierStyles(tier, isFailed, isTooFar)}`}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{statusTitle(phase, isCheckingLocation)}</p>
          <p className="mt-1 text-xs opacity-90">
            {isFailed
              ? (error && error !== GPS_UNAVAILABLE_MSG ? error : GPS_INDOOR_HINT)
              : isTooFar
                ? (tooFarMessage ??
                  "Move closer to the shop entrance, then tap Refresh Location.")
                : isVerified || hasMetrics
                  ? `~${Math.round(accuracyMeters ?? 0)} m GPS accuracy · ${Math.round(distanceMeters ?? 0)} m from shop`
                  : isChecking
                    ? GPS_INDOOR_HINT
                    : "Allow location permission — we verify you are at this shop before punching"}
          </p>
          {weak && !isFailed ? (
            <p className="mt-2 text-xs font-medium opacity-95">{GPS_WEAK_HINT}</p>
          ) : null}
        </div>
        {!isFailed && !isTooFar && !isChecking ? (
          <span className="shrink-0 rounded-full border border-current/30 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide">
            {isVerified ? gpsAccuracyTierLabel(tier) : "…"}
          </span>
        ) : null}
      </div>

      {showActionButton ? (
        <button
          type="button"
          disabled={actionDisabled}
          onClick={handleAction}
          className={`mt-3 w-full rounded-lg border px-3 py-2.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed ${
            isVerified && !weak
              ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-800 dark:text-emerald-100"
              : "border-current/30 bg-white/60 hover:bg-white/90 dark:bg-black/20 dark:hover:bg-black/30"
          } disabled:opacity-60`}
        >
          {actionButtonLabel(phase, isCheckingLocation, isVerified, tier)}
        </button>
      ) : null}
    </section>
  );
}

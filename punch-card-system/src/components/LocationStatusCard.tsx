"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getClockGpsVerifyServerSnapshot,
  getClockGpsVerifySnapshot,
  refreshClockGpsVerification,
  shouldOfferLocationRefresh,
  subscribeClockGpsVerify,
} from "@/lib/clock-verified-gps";
import { GPS_WEAK_HINT, gpsAccuracyTier, gpsAccuracyTierLabel } from "@/lib/geolocation-client";

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

function statusTitle(phase: string, error: string | null, isRefreshing: boolean): string {
  if (isRefreshing || phase === "checking") return "Checking location…";
  if (error) return "Location unavailable";
  switch (phase) {
    case "verified":
      return "Location verified, ready to punch";
    case "too_far":
      return "Too far from shop";
    default:
      return "Checking location…";
  }
}

function refreshButtonLabel(
  phase: string,
  isRefreshing: boolean,
  isVerified: boolean,
  tier: ReturnType<typeof gpsAccuracyTier>,
): string {
  if (isRefreshing || phase === "checking") return "Checking…";
  if (isVerified && tier !== "weak") return "Location Verified";
  return "Refresh Location";
}

export function LocationStatusCard() {
  const snap = useSyncExternalStore(
    subscribeClockGpsVerify,
    getClockGpsVerifySnapshot,
    getClockGpsVerifyServerSnapshot,
  );

  const { phase, error, tooFarMessage, verified, distanceMeters, accuracyMeters, isRefreshing } =
    snap;
  const tier = gpsAccuracyTier(accuracyMeters);
  const isVerified = phase === "verified" && !!verified;
  const isTooFar = phase === "too_far";
  const weak = tier === "weak";

  const showRefresh =
    shouldOfferLocationRefresh(snap) ||
    isRefreshing ||
    (isVerified && weak);

  const refreshDisabled =
    isRefreshing || phase === "checking" || (isVerified && !weak);

  const handleRefresh = useCallback(() => {
    if (refreshDisabled) return;
    void refreshClockGpsVerification();
  }, [refreshDisabled]);

  const hasMetrics =
    distanceMeters != null &&
    accuracyMeters != null &&
    Number.isFinite(distanceMeters) &&
    Number.isFinite(accuracyMeters);

  return (
    <section
      className={`rounded-xl border px-4 py-3 text-sm ${tierStyles(tier, !!error, isTooFar)}`}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{statusTitle(phase, error, isRefreshing)}</p>
          <p className="mt-1 text-xs opacity-90">
            {error
              ? error
              : isTooFar
                ? (tooFarMessage ??
                  "Move closer to the shop entrance, then tap Refresh Location.")
                : isVerified || hasMetrics
                  ? `~${Math.round(accuracyMeters ?? 0)} m GPS accuracy · ${Math.round(distanceMeters ?? 0)} m from shop`
                  : "Allow location permission — we verify you are at this shop before punching"}
          </p>
          {weak && !error ? (
            <p className="mt-2 text-xs font-medium opacity-95">{GPS_WEAK_HINT}</p>
          ) : null}
        </div>
        {!error && !isTooFar && !isRefreshing && phase !== "checking" ? (
          <span className="shrink-0 rounded-full border border-current/30 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide">
            {isVerified ? gpsAccuracyTierLabel(tier) : "…"}
          </span>
        ) : null}
      </div>

      {showRefresh ? (
        <button
          type="button"
          disabled={refreshDisabled}
          onClick={handleRefresh}
          className={`mt-3 w-full rounded-lg border px-3 py-2.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed ${
            isVerified && !weak
              ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-800 dark:text-emerald-100"
              : "border-current/30 bg-white/60 hover:bg-white/90 dark:bg-black/20 dark:hover:bg-black/30"
          } disabled:opacity-60`}
        >
          {refreshButtonLabel(phase, isRefreshing, isVerified, tier)}
        </button>
      ) : null}
    </section>
  );
}

/** High-rise indoor: progressive base-radius expansion when GPS is weak but plausibly on-site. */

export const INDOOR_FALLBACK_MIN_CONFIDENCE = 50;
export const INDOOR_FALLBACK_MIN_ACCURACY_M = 50;
export const INDOOR_FALLBACK_MAX_RADIUS_M = 150;

/** Attempt 1 = standard verify; 2 = ×1.5; 3 = ×2 (base allowed_radius_meters). */
export const INDOOR_FALLBACK_RADIUS_MULTIPLIERS = [1, 1.5, 2] as const;

export type IndoorFallbackAttempt = 1 | 2 | 3;

export const INDOOR_FALLBACK_ACTIVATED_MSG = "Indoor fallback activated";
export const INDOOR_FALLBACK_EXPANDED_MSG =
  "GPS range expanded for weak indoor signal";
export const INDOOR_FALLBACK_STATUS_LABEL = "Weak Indoor / Expanded Radius";
export const INDOOR_FALLBACK_FAIL_MSG =
  "Location not reliable. Please refresh location.";

export function expandedIndoorBaseRadius(
  baseRadiusM: number,
  multiplier: number,
): number {
  if (!Number.isFinite(baseRadiusM) || baseRadiusM <= 0) return 0;
  return Math.min(Math.round(baseRadiusM * multiplier), INDOOR_FALLBACK_MAX_RADIUS_M);
}

export function indoorFallbackAttemptFromMultiplier(
  multiplier: number,
): IndoorFallbackAttempt {
  if (multiplier >= 2) return 3;
  if (multiplier >= 1.5) return 2;
  return 1;
}

export function canUseIndoorRadiusFallback(
  shopIndoorMode: boolean | undefined,
  accuracyM: number | null,
  preliminaryConfidenceScore: number,
): boolean {
  return (
    shopIndoorMode === true &&
    accuracyM != null &&
    Number.isFinite(accuracyM) &&
    accuracyM > INDOOR_FALLBACK_MIN_ACCURACY_M &&
    preliminaryConfidenceScore >= INDOOR_FALLBACK_MIN_CONFIDENCE
  );
}

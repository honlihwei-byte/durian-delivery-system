import { haversineDistanceMeters } from "@/lib/geo";
import type { IndoorGpsSession } from "@/lib/gps-indoor-session";
import { INDOOR_SESSION_MAX_DRIFT_M, isIndoorSessionUsable } from "@/lib/gps-indoor-session";
import {
  computeLocationConfidence,
  type ConfidenceDisplayLabel,
} from "@/lib/location-confidence";

export type ShopGpsLocationType = "main" | "office" | "parking" | "loading" | "backup";

export type ShopGpsLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  allowed_radius_meters: number;
  location_type: ShopGpsLocationType;
};

export type ShopForPunch = {
  id: string;
  name: string;
  locations: ShopGpsLocation[];
  gpsIndoorMode?: boolean;
};

export type ShopGpsPoint = {
  latitude: number;
  longitude: number;
  allowed_radius_meters: number;
};

export type GpsVerifyTier = "verified" | "weak_indoor" | "rejected" | "review_required";

export type GpsCheckResult = {
  staffLat: number;
  staffLng: number;
  distanceM: number;
  radiusM: number;
  effectiveRadiusM: number;
  gpsAccuracyMeters: number | null;
  gpsVerified: boolean;
  verifyTier: GpsVerifyTier;
  allowsPunch: boolean;
  weakAccuracy: boolean;
  reviewRequired: boolean;
  indoorSessionUsed: boolean;
};

export type GpsLocationMatchResult = GpsCheckResult & {
  matchedLocation: ShopGpsLocation | null;
  sampleCount: number;
  sampleSpreadM: number | null;
  locationConfidenceScore: number;
  confidenceDisplayLabel: ConfidenceDisplayLabel;
};

export type GpsVerifyContext = {
  sampleCount?: number;
  sampleSpreadM?: number | null;
  indoorSession?: IndoorGpsSession | null;
  shopIndoorMode?: boolean;
};

export const TOO_FAR_MSG = "You are too far from this shop. Clock in/out is not allowed.";
export const GPS_WEAK_ACCURACY_THRESHOLD_M = 100;
export const GPS_INDOOR_GOOD_ACCURACY_M = 80;
export const GPS_UNSTABLE_SPREAD_M = 60;

const INDOOR_ACCURACY_FACTOR = 0.85;
const INDOOR_MAX_EXTRA_RADIUS_M = 120;
const OUTDOOR_ACCURACY_FACTOR = 0.5;
const OUTDOOR_MAX_EXTRA_RADIUS_M = 50;
const SESSION_GRACE_RADIUS_M = 30;
const REVIEW_MARGIN_FACTOR = 1.12;

export function shopUsesIndoorProfile(
  locations: ShopGpsLocation[],
  shopIndoorMode?: boolean,
): boolean {
  if (shopIndoorMode) return true;
  if (locations.some((l) => l.location_type === "office")) return true;
  return locations.length >= 2;
}

function locationPrefersIndoorRadius(type: ShopGpsLocationType, indoorProfile: boolean): boolean {
  if (!indoorProfile) return false;
  return type === "office" || type === "main";
}

/**
 * Adaptive pass radius: base + capped accuracy buffer (tighter outdoors).
 */
export function effectiveRadiusMeters(
  baseRadius: number,
  accuracyM: number | null,
  locationType: ShopGpsLocationType,
  indoorProfile: boolean,
): number {
  const indoorLike = indoorProfile && locationPrefersIndoorRadius(locationType, indoorProfile);
  const factor = indoorLike ? INDOOR_ACCURACY_FACTOR : OUTDOOR_ACCURACY_FACTOR;
  const cap = indoorLike ? INDOOR_MAX_EXTRA_RADIUS_M : OUTDOOR_MAX_EXTRA_RADIUS_M;
  const extra =
    accuracyM != null && Number.isFinite(accuracyM) && accuracyM > 0
      ? Math.min(accuracyM * factor, cap)
      : 0;
  return baseRadius + extra;
}

function classifyTier(
  distanceM: number,
  effectiveRadius: number,
  accuracyM: number | null,
  sampleSpreadM: number | null,
  sampleCount: number,
  indoorProfile: boolean,
): Pick<GpsCheckResult, "verifyTier" | "allowsPunch" | "gpsVerified" | "reviewRequired"> {
  const within = distanceM <= effectiveRadius;

  if (!within) {
    if (distanceM <= effectiveRadius * REVIEW_MARGIN_FACTOR && indoorProfile) {
      return {
        verifyTier: "review_required",
        allowsPunch: true,
        gpsVerified: true,
        reviewRequired: true,
      };
    }
    return {
      verifyTier: "rejected",
      allowsPunch: false,
      gpsVerified: false,
      reviewRequired: false,
    };
  }

  const spread =
    sampleSpreadM != null && Number.isFinite(sampleSpreadM) ? sampleSpreadM : null;
  const unstable =
    sampleCount >= 2 &&
    spread != null &&
    spread > GPS_UNSTABLE_SPREAD_M &&
    (accuracyM == null || accuracyM > GPS_INDOOR_GOOD_ACCURACY_M);

  const goodAccuracy =
    accuracyM != null && Number.isFinite(accuracyM) && accuracyM <= GPS_INDOOR_GOOD_ACCURACY_M;

  if (goodAccuracy && !unstable) {
    return {
      verifyTier: "verified",
      allowsPunch: true,
      gpsVerified: true,
      reviewRequired: false,
    };
  }

  if (unstable && indoorProfile) {
    return {
      verifyTier: "review_required",
      allowsPunch: true,
      gpsVerified: true,
      reviewRequired: true,
    };
  }

  const weakIndoor =
    indoorProfile ||
    (accuracyM != null && accuracyM > GPS_INDOOR_GOOD_ACCURACY_M) ||
    unstable;

  if (weakIndoor) {
    return {
      verifyTier: "weak_indoor",
      allowsPunch: true,
      gpsVerified: true,
      reviewRequired: false,
    };
  }

  return {
    verifyTier: "verified",
    allowsPunch: true,
    gpsVerified: true,
    reviewRequired: false,
  };
}

export function checkGpsAgainstPoint(
  point: ShopGpsPoint,
  staffLat: number,
  staffLng: number,
  accuracyM: number | null,
  opts?: {
    locationType?: ShopGpsLocationType;
    indoorProfile?: boolean;
    sampleSpreadM?: number | null;
    sampleCount?: number;
  },
): GpsCheckResult {
  const distanceM = haversineDistanceMeters(
    staffLat,
    staffLng,
    point.latitude,
    point.longitude,
  );
  const radiusM = point.allowed_radius_meters;
  const indoorProfile = opts?.indoorProfile ?? false;
  const locationType = opts?.locationType ?? "main";
  const effectiveRadius = effectiveRadiusMeters(
    radiusM,
    accuracyM,
    locationType,
    indoorProfile,
  );

  const tierResult = classifyTier(
    distanceM,
    effectiveRadius,
    accuracyM,
    opts?.sampleSpreadM ?? null,
    opts?.sampleCount ?? 1,
    indoorProfile,
  );

  const weakAccuracy =
    accuracyM != null &&
    Number.isFinite(accuracyM) &&
    accuracyM > GPS_WEAK_ACCURACY_THRESHOLD_M;

  return {
    staffLat,
    staffLng,
    distanceM,
    radiusM,
    effectiveRadiusM: effectiveRadius,
    gpsAccuracyMeters: accuracyM,
    weakAccuracy,
    indoorSessionUsed: false,
    ...tierResult,
  };
}

/** @deprecated use checkGpsAgainstPoint or checkGpsAgainstLocations */
export function checkGpsAgainstShop(
  shop: ShopGpsPoint,
  staffLat: number,
  staffLng: number,
  accuracyM: number | null,
): GpsCheckResult {
  return checkGpsAgainstPoint(shop, staffLat, staffLng, accuracyM);
}

function applySessionGrace(
  result: GpsLocationMatchResult,
  session: IndoorGpsSession | null,
  staffLat: number,
  staffLng: number,
  indoorProfile: boolean,
  locations: ShopGpsLocation[],
  context: GpsVerifyContext,
): GpsLocationMatchResult {
  if (result.allowsPunch || !session || !indoorProfile) return result;
  if (!isIndoorSessionUsable(session, staffLat, staffLng)) return result;
  if (session.verifyTier === "rejected") return result;

  const sessionCheck = checkGpsAgainstLocations(
    locations,
    session.latitude,
    session.longitude,
    session.accuracyMeters,
    {
      sampleCount: context.sampleCount,
      sampleSpreadM: context.sampleSpreadM,
      shopIndoorMode: context.shopIndoorMode,
      indoorSession: null,
    },
  );
  if (!sessionCheck.allowsPunch) return result;

  const drift = haversineDistanceMeters(
    session.latitude,
    session.longitude,
    staffLat,
    staffLng,
  );
  if (drift > INDOOR_SESSION_MAX_DRIFT_M) return result;
  if (result.distanceM > sessionCheck.effectiveRadiusM + SESSION_GRACE_RADIUS_M) return result;

  return {
    ...result,
    gpsVerified: true,
    allowsPunch: true,
    verifyTier: "weak_indoor",
    reviewRequired: false,
    indoorSessionUsed: true,
    matchedLocation: sessionCheck.matchedLocation ?? result.matchedLocation,
    distanceM: result.distanceM,
    effectiveRadiusM: sessionCheck.effectiveRadiusM,
  };
}

/**
 * Verify against all active locations — pass if any match.
 * Uses closest matching location; if none match, distance is to closest point.
 */
export function checkGpsAgainstLocations(
  locations: ShopGpsLocation[],
  staffLat: number,
  staffLng: number,
  accuracyM: number | null,
  context?: GpsVerifyContext,
): GpsLocationMatchResult {
  const sampleCount = context?.sampleCount ?? 1;
  const sampleSpreadM = context?.sampleSpreadM ?? null;
  const indoorProfile = shopUsesIndoorProfile(locations, context?.shopIndoorMode);

  const baseEmpty: GpsLocationMatchResult = {
    staffLat,
    staffLng,
    distanceM: Infinity,
    radiusM: 0,
    effectiveRadiusM: 0,
    gpsAccuracyMeters: accuracyM,
    gpsVerified: false,
    verifyTier: "rejected",
    allowsPunch: false,
    weakAccuracy:
      accuracyM != null &&
      Number.isFinite(accuracyM) &&
      accuracyM > GPS_WEAK_ACCURACY_THRESHOLD_M,
    reviewRequired: false,
    indoorSessionUsed: false,
    matchedLocation: null,
    sampleCount,
    sampleSpreadM,
    locationConfidenceScore: 0,
    confidenceDisplayLabel: "Rejected",
  };

  if (locations.length === 0) {
    const empty = applySessionGrace(
      baseEmpty,
      context?.indoorSession ?? null,
      staffLat,
      staffLng,
      indoorProfile,
      locations,
      context ?? {},
    );
    return applyConfidenceToResult(empty, context?.indoorSession ?? null, indoorProfile);
  }

  let bestPass: { location: ShopGpsLocation; check: GpsCheckResult } | null = null;
  let bestPassRank = -1;
  let closestFailed: { location: ShopGpsLocation; check: GpsCheckResult } | null = null;

  const tierRank: Record<GpsVerifyTier, number> = {
    verified: 3,
    weak_indoor: 2,
    review_required: 1,
    rejected: 0,
  };

  for (const location of locations) {
    const check = checkGpsAgainstPoint(
      {
        latitude: location.latitude,
        longitude: location.longitude,
        allowed_radius_meters: location.allowed_radius_meters,
      },
      staffLat,
      staffLng,
      accuracyM,
      {
        locationType: location.location_type,
        indoorProfile,
        sampleSpreadM,
        sampleCount,
      },
    );

    if (check.allowsPunch) {
      const rank = tierRank[check.verifyTier];
      if (
        !bestPass ||
        rank > bestPassRank ||
        (rank === bestPassRank && check.distanceM < bestPass.check.distanceM)
      ) {
        bestPass = { location, check };
        bestPassRank = rank;
      }
    } else if (!closestFailed || check.distanceM < closestFailed.check.distanceM) {
      closestFailed = { location, check };
    }
  }

  let result: GpsLocationMatchResult;

  if (bestPass) {
    result = {
      ...bestPass.check,
      matchedLocation: bestPass.location,
      sampleCount,
      sampleSpreadM,
      locationConfidenceScore: 0,
      confidenceDisplayLabel: "Rejected",
    };
  } else {
    const fallback = closestFailed!;
    result = {
      ...fallback.check,
      matchedLocation: null,
      sampleCount,
      sampleSpreadM,
      locationConfidenceScore: 0,
      confidenceDisplayLabel: "Rejected",
    };
  }

  const withSession = applySessionGrace(
    result,
    context?.indoorSession ?? null,
    staffLat,
    staffLng,
    indoorProfile,
    locations,
    context ?? {},
  );

  return applyConfidenceToResult(withSession, context?.indoorSession ?? null, indoorProfile);
}

function applyConfidenceToResult(
  result: GpsLocationMatchResult,
  session: IndoorGpsSession | null,
  indoorProfile: boolean,
): GpsLocationMatchResult {
  const hasActiveSession =
    session != null &&
    isIndoorSessionUsable(session, result.staffLat, result.staffLng) &&
    session.verifyTier !== "rejected";

  const confidence = computeLocationConfidence({
    distanceM: result.distanceM,
    effectiveRadiusM: result.effectiveRadiusM,
    accuracyM: result.gpsAccuracyMeters,
    sampleCount: result.sampleCount,
    sampleSpreadM: result.sampleSpreadM,
    indoorProfile,
    indoorSessionUsed: result.indoorSessionUsed,
    hasActiveSession,
  });

  return {
    ...result,
    locationConfidenceScore: confidence.score,
    confidenceDisplayLabel: confidence.displayLabel,
    verifyTier: confidence.tier,
    allowsPunch: confidence.allowsPunch,
    gpsVerified: confidence.gpsVerified,
    reviewRequired: confidence.reviewRequired,
  };
}

export function gpsStatusLabelFromTier(
  tier: GpsVerifyTier | null | undefined,
  hasCoords: boolean,
): "Verified" | "Weak Indoor" | "Rejected" | "Review Required" | "Location not available" {
  if (!hasCoords) return "Location not available";
  switch (tier) {
    case "verified":
      return "Verified";
    case "weak_indoor":
      return "Weak Indoor";
    case "review_required":
      return "Review Required";
    case "rejected":
      return "Rejected";
    default:
      return "Rejected";
  }
}

import { haversineDistanceMeters } from "@/lib/geo";

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
};

export type ShopGpsPoint = {
  latitude: number;
  longitude: number;
  allowed_radius_meters: number;
};

export type GpsCheckResult = {
  staffLat: number;
  staffLng: number;
  distanceM: number;
  radiusM: number;
  gpsAccuracyMeters: number | null;
  gpsVerified: boolean;
  weakAccuracy: boolean;
};

export type GpsLocationMatchResult = GpsCheckResult & {
  matchedLocation: ShopGpsLocation | null;
};

export const TOO_FAR_MSG = "You are too far from this shop. Clock in/out is not allowed.";
export const GPS_WEAK_ACCURACY_THRESHOLD_M = 100;

/**
 * Pass if within point radius, or within radius + reported accuracy (uncertainty buffer).
 */
export function checkGpsAgainstPoint(
  point: ShopGpsPoint,
  staffLat: number,
  staffLng: number,
  accuracyM: number | null,
): GpsCheckResult {
  const distanceM = haversineDistanceMeters(
    staffLat,
    staffLng,
    point.latitude,
    point.longitude,
  );
  const radiusM = point.allowed_radius_meters;
  let gpsVerified = distanceM <= radiusM;

  if (!gpsVerified && accuracyM != null && Number.isFinite(accuracyM) && accuracyM > 0) {
    gpsVerified = distanceM <= radiusM + accuracyM;
  }

  const weakAccuracy =
    accuracyM != null && Number.isFinite(accuracyM) && accuracyM > GPS_WEAK_ACCURACY_THRESHOLD_M;

  return {
    staffLat,
    staffLng,
    distanceM,
    radiusM,
    gpsAccuracyMeters: accuracyM,
    gpsVerified,
    weakAccuracy,
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

/**
 * Verify against all active locations — pass if any match.
 * Uses closest matching location; if none match, distance is to closest point.
 */
export function checkGpsAgainstLocations(
  locations: ShopGpsLocation[],
  staffLat: number,
  staffLng: number,
  accuracyM: number | null,
): GpsLocationMatchResult {
  if (locations.length === 0) {
    return {
      staffLat,
      staffLng,
      distanceM: Infinity,
      radiusM: 0,
      gpsAccuracyMeters: accuracyM,
      gpsVerified: false,
      weakAccuracy:
        accuracyM != null &&
        Number.isFinite(accuracyM) &&
        accuracyM > GPS_WEAK_ACCURACY_THRESHOLD_M,
      matchedLocation: null,
    };
  }

  let bestVerified: { location: ShopGpsLocation; check: GpsCheckResult } | null = null;
  let closestFailed: { location: ShopGpsLocation; check: GpsCheckResult } | null = null;

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
    );

    if (check.gpsVerified) {
      if (!bestVerified || check.distanceM < bestVerified.check.distanceM) {
        bestVerified = { location, check };
      }
    } else if (!closestFailed || check.distanceM < closestFailed.check.distanceM) {
      closestFailed = { location, check };
    }
  }

  if (bestVerified) {
    return { ...bestVerified.check, matchedLocation: bestVerified.location };
  }

  const fallback = closestFailed!;
  return { ...fallback.check, matchedLocation: null };
}

import { haversineDistanceMeters } from "@/lib/geo";

/** Shared shop GPS shape (safe for client + server). */
export type ShopForPunch = {
  id: string;
  name: string;
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

export const TOO_FAR_MSG = "You are too far from this shop. Clock in/out is not allowed.";
export const GPS_WEAK_ACCURACY_THRESHOLD_M = 100;

/**
 * Pass if within shop radius, or within radius + reported accuracy (uncertainty buffer).
 */
export function checkGpsAgainstShop(
  shop: ShopForPunch,
  staffLat: number,
  staffLng: number,
  accuracyM: number | null,
): GpsCheckResult {
  const distanceM = haversineDistanceMeters(
    staffLat,
    staffLng,
    shop.latitude,
    shop.longitude,
  );
  const radiusM = shop.allowed_radius_meters;
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

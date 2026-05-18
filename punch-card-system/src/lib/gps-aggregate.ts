import { haversineDistanceMeters } from "@/lib/geo";
import type { StaffPosition } from "@/lib/geolocation-client";

export type AggregatedGpsPosition = StaffPosition & {
  sampleCount: number;
  sampleSpreadMeters: number;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Max pairwise distance between samples (0 if single sample). */
export function gpsSampleSpreadMeters(samples: StaffPosition[]): number {
  if (samples.length < 2) return 0;
  let maxSpread = 0;
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      const d = haversineDistanceMeters(
        samples[i]!.latitude,
        samples[i]!.longitude,
        samples[j]!.latitude,
        samples[j]!.longitude,
      );
      if (d > maxSpread) maxSpread = d;
    }
  }
  return maxSpread;
}

/**
 * Robust position for verification: median lat/lng, best (lowest) reported accuracy.
 */
export function aggregateGpsSamples(samples: StaffPosition[]): AggregatedGpsPosition | null {
  if (samples.length === 0) return null;

  const latitudes = samples.map((s) => s.latitude);
  const longitudes = samples.map((s) => s.longitude);
  const accuracyMeters = Math.min(...samples.map((s) => s.accuracyMeters));

  return {
    latitude: median(latitudes),
    longitude: median(longitudes),
    accuracyMeters,
    sampleCount: samples.length,
    sampleSpreadMeters: gpsSampleSpreadMeters(samples),
  };
}

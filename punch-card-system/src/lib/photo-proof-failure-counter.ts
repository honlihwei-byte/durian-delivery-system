/**
 * Indoor GPS failure counter (per shop + device). Photo proof unlocks after 3 failed rounds.
 */

import { getPunchDeviceId } from "@/lib/gps-indoor-trusted-device";

export const PHOTO_PROOF_MIN_FAILURES = 3;
export const PHOTO_PROOF_FAILURE_TTL_MS = 30 * 60 * 1000;

const STORAGE_PREFIX = "punch-indoor-fail-v1-";

type FailureRecord = {
  count: number;
  updatedAt: number;
};

const listeners = new Set<() => void>();
let lastRecordedGpsRequestId: number | null = null;

function storageKey(shopId: string): string {
  return `${STORAGE_PREFIX}${shopId}-${getPunchDeviceId()}`;
}

function notifyListeners(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

function readRecord(shopId: string): FailureRecord {
  if (typeof localStorage === "undefined" || !shopId) {
    return { count: 0, updatedAt: 0 };
  }
  try {
    const raw = localStorage.getItem(storageKey(shopId));
    if (!raw) return { count: 0, updatedAt: 0 };
    const parsed = JSON.parse(raw) as FailureRecord;
    if (
      typeof parsed.count !== "number" ||
      typeof parsed.updatedAt !== "number" ||
      Date.now() - parsed.updatedAt > PHOTO_PROOF_FAILURE_TTL_MS
    ) {
      return { count: 0, updatedAt: 0 };
    }
    return parsed;
  } catch {
    return { count: 0, updatedAt: 0 };
  }
}

function writeRecord(shopId: string, record: FailureRecord): void {
  if (typeof localStorage === "undefined" || !shopId) return;
  try {
    localStorage.setItem(storageKey(shopId), JSON.stringify(record));
  } catch {
    /* ignore */
  }
  notifyListeners();
}

export function getIndoorVerifyFailureCount(shopId: string): number {
  return readRecord(shopId).count;
}

export function resetIndoorVerifyFailures(shopId: string): void {
  if (!shopId) return;
  lastRecordedGpsRequestId = null;
  writeRecord(shopId, { count: 0, updatedAt: Date.now() });
}

/** One increment per GPS verify request when indoor punch is still not allowed. */
export function recordIndoorVerifyFailure(shopId: string, gpsRequestId: number): void {
  if (!shopId) return;
  if (lastRecordedGpsRequestId === gpsRequestId) return;
  lastRecordedGpsRequestId = gpsRequestId;

  const prev = readRecord(shopId);
  writeRecord(shopId, {
    count: prev.count + 1,
    updatedAt: Date.now(),
  });
}

export function subscribeIndoorVerifyFailures(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getIndoorVerifyFailureSnapshot(shopId: string): number {
  return getIndoorVerifyFailureCount(shopId);
}

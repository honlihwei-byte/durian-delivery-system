import {
  checkGpsAgainstShop,
  TOO_FAR_MSG,
  type ShopForPunch,
} from "@/lib/gps-shop-verify";
import {
  forceRefreshGpsPosition,
  getCachedGpsPosition,
  getLocationPrepareSnapshot,
  GPS_WEAK_ACCURACY_METERS,
  startPreparedLocationService,
  subscribeGpsCache,
  type CachedGpsPosition,
} from "@/lib/geolocation-client";

export type VerifiedGps = CachedGpsPosition & {
  distanceMeters: number;
  gpsVerified: true;
};

export type ClockGpsVerifyPhase = "checking" | "verified" | "too_far" | "error";

export type ClockGpsVerifySnapshot = {
  phase: ClockGpsVerifyPhase;
  error: string | null;
  tooFarMessage: string | null;
  verified: VerifiedGps | null;
  distanceMeters: number | null;
  accuracyMeters: number | null;
  isRefreshing: boolean;
};

const INITIAL_SNAPSHOT: ClockGpsVerifySnapshot = {
  phase: "checking",
  error: null,
  tooFarMessage: null,
  verified: null,
  distanceMeters: null,
  accuracyMeters: null,
  isRefreshing: false,
};

/** Stable reference for useSyncExternalStore — must not allocate each getSnapshot call. */
let cachedSnapshot: ClockGpsVerifySnapshot = INITIAL_SNAPSHOT;

let activeShop: ShopForPunch | null = null;
let verified: VerifiedGps | null = null;
let phase: ClockGpsVerifyPhase = "checking";
let verifyError: string | null = null;
let tooFarMessage: string | null = null;
let distanceMeters: number | null = null;
let accuracyMeters: number | null = null;
let isRefreshing = false;
let stopGpsService: (() => void) | null = null;
let pollId: number | null = null;
let verifyListeners = new Set<() => void>();
let verificationStartedForShopId: string | null = null;
let refreshInFlight: Promise<void> | null = null;
let lastRefreshAt = 0;

const REFRESH_COOLDOWN_MS = 3000;

function buildSnapshot(): ClockGpsVerifySnapshot {
  return {
    phase,
    error: verifyError,
    tooFarMessage,
    verified,
    distanceMeters,
    accuracyMeters,
    isRefreshing,
  };
}

function snapshotsEqual(a: ClockGpsVerifySnapshot, b: ClockGpsVerifySnapshot): boolean {
  if (a.phase !== b.phase) return false;
  if (a.error !== b.error) return false;
  if (a.tooFarMessage !== b.tooFarMessage) return false;
  if (a.distanceMeters !== b.distanceMeters) return false;
  if (a.accuracyMeters !== b.accuracyMeters) return false;
  if (a.isRefreshing !== b.isRefreshing) return false;
  const av = a.verified;
  const bv = b.verified;
  if (av === bv) return true;
  if (!av || !bv) return false;
  return (
    av.latitude === bv.latitude &&
    av.longitude === bv.longitude &&
    av.accuracyMeters === bv.accuracyMeters &&
    av.cachedAt === bv.cachedAt &&
    av.distanceMeters === bv.distanceMeters
  );
}

function commitSnapshot(next: ClockGpsVerifySnapshot): boolean {
  if (snapshotsEqual(cachedSnapshot, next)) return false;
  cachedSnapshot = next;
  return true;
}

function notifyVerify() {
  if (!commitSnapshot(buildSnapshot())) return;
  for (const fn of verifyListeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

function recomputeVerification() {
  if (!activeShop) return;

  try {
    const prepare = getLocationPrepareSnapshot();
    if (prepare.error) {
      phase = "error";
      verifyError = prepare.error;
      tooFarMessage = null;
      verified = null;
      distanceMeters = null;
      accuracyMeters = null;
      notifyVerify();
      return;
    }

    const cached = getCachedGpsPosition();
    if (!cached) {
      phase = prepare.status === "error" ? "error" : "checking";
      verifyError = prepare.status === "error" ? prepare.error : null;
      tooFarMessage = null;
      verified = null;
      distanceMeters = null;
      accuracyMeters = null;
      notifyVerify();
      return;
    }

    accuracyMeters = cached.accuracyMeters;
    const check = checkGpsAgainstShop(
      activeShop,
      cached.latitude,
      cached.longitude,
      cached.accuracyMeters,
    );
    distanceMeters = check.distanceM;

    if (check.gpsVerified) {
      phase = "verified";
      verifyError = null;
      tooFarMessage = null;
      verified = {
        ...cached,
        distanceMeters: Math.round(check.distanceM * 100) / 100,
        gpsVerified: true,
      };
    } else {
      phase = "too_far";
      verifyError = null;
      tooFarMessage = TOO_FAR_MSG;
      verified = null;
    }
    notifyVerify();
  } catch (e) {
    phase = "error";
    verifyError = e instanceof Error ? e.message : "Could not verify location";
    verified = null;
    notifyVerify();
  }
}

export function subscribeClockGpsVerify(listener: () => void): () => void {
  verifyListeners.add(listener);
  return () => verifyListeners.delete(listener);
}

/** Stable snapshot reference (required for useSyncExternalStore). */
export function getClockGpsVerifySnapshot(): ClockGpsVerifySnapshot {
  return cachedSnapshot;
}

export function getClockGpsVerifyServerSnapshot(): ClockGpsVerifySnapshot {
  return INITIAL_SNAPSHOT;
}

export function isGpsVerifiedForPunch(): boolean {
  return phase === "verified" && verified != null;
}

/** Show refresh when location failed, too far, or accuracy is weak. */
export function shouldOfferLocationRefresh(snap: ClockGpsVerifySnapshot): boolean {
  if (snap.isRefreshing) return true;
  if (snap.phase === "too_far" || snap.phase === "error") return true;
  if (
    snap.accuracyMeters != null &&
    Number.isFinite(snap.accuracyMeters) &&
    snap.accuracyMeters > GPS_WEAK_ACCURACY_METERS
  ) {
    return true;
  }
  return false;
}

/** Use at punch only — no geolocation call. */
export function getVerifiedGpsForPunch(): VerifiedGps {
  if (!verified || phase !== "verified") {
    throw new Error("Location is not verified. Wait until you are within shop range.");
  }
  return verified;
}

/**
 * Retry GPS + distance check without reloading the page.
 * Debounced; safe to call from Refresh Location button.
 */
export function refreshClockGpsVerification(): Promise<void> {
  if (typeof window === "undefined" || !activeShop) {
    return Promise.resolve();
  }

  const now = Date.now();
  if (refreshInFlight) return refreshInFlight;
  if (isRefreshing && now - lastRefreshAt < REFRESH_COOLDOWN_MS) {
    return Promise.resolve();
  }
  if (now - lastRefreshAt < REFRESH_COOLDOWN_MS) {
    return Promise.resolve();
  }

  lastRefreshAt = now;
  isRefreshing = true;
  phase = "checking";
  verifyError = null;
  tooFarMessage = null;
  verified = null;
  distanceMeters = null;
  accuracyMeters = null;
  notifyVerify();

  refreshInFlight = (async () => {
    try {
      await forceRefreshGpsPosition();
      recomputeVerification();
    } catch (e) {
      phase = "error";
      verifyError = e instanceof Error ? e.message : "Could not refresh location";
      verified = null;
      notifyVerify();
    } finally {
      isRefreshing = false;
      refreshInFlight = null;
      recomputeVerification();
    }
  })();

  return refreshInFlight;
}

/**
 * Start GPS acquisition + distance verification for a shop (once per shop id until stopped).
 */
export function startClockGpsVerification(shop: ShopForPunch): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  if (verificationStartedForShopId === shop.id && stopGpsService) {
    return () => {};
  }

  if (stopGpsService) {
    stopGpsService();
    stopGpsService = null;
  }

  verificationStartedForShopId = shop.id;
  activeShop = shop;
  phase = "checking";
  verifyError = null;
  tooFarMessage = null;
  verified = null;
  isRefreshing = false;
  notifyVerify();

  stopGpsService = startPreparedLocationService();

  const unsubGps = subscribeGpsCache(recomputeVerification);
  recomputeVerification();

  if (pollId != null) window.clearInterval(pollId);
  pollId = window.setInterval(recomputeVerification, 1000);

  return () => {
    if (pollId != null) window.clearInterval(pollId);
    pollId = null;
    unsubGps();
    if (stopGpsService) {
      stopGpsService();
      stopGpsService = null;
    }
    activeShop = null;
    verified = null;
    phase = "checking";
    isRefreshing = false;
    refreshInFlight = null;
    verificationStartedForShopId = null;
    commitSnapshot(INITIAL_SNAPSHOT);
    notifyVerify();
  };
}

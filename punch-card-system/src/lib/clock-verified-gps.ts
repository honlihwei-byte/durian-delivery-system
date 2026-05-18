import {
  checkGpsAgainstLocations,
  TOO_FAR_MSG,
  GPS_UNSTABLE_SPREAD_M,
  type GpsVerifyTier,
  type ShopForPunch,
  type ShopGpsLocationType,
} from "@/lib/gps-shop-verify";
import {
  readIndoorGpsSession,
  saveIndoorGpsSession,
  type IndoorGpsSession,
} from "@/lib/gps-indoor-session";
import { formatVerifiedViaLabel } from "@/lib/shop-gps-locations";
import {
  forceRefreshGpsPosition,
  getCachedGpsPosition,
  getCachedGpsPositionForDisplay,
  getGpsSampleMeta,
  getLocationPrepareSnapshot,
  GPS_INDOOR_HINT,
  GPS_PREPARE_STUCK_MS,
  GPS_UNAVAILABLE_MSG,
  GPS_WEAK_ACCURACY_METERS,
  hardRestartLocationService,
  startPreparedLocationService,
  subscribeGpsCache,
  type CachedGpsPosition,
} from "@/lib/geolocation-client";

export type VerifiedGps = CachedGpsPosition & {
  distanceMeters: number;
  gpsVerified: true;
  verifyTier: GpsVerifyTier;
  reviewRequired: boolean;
  indoorSessionUsed: boolean;
  matchedLocationId: string;
  matchedLocationName: string;
  matchedLocationType: ShopGpsLocationType;
  sampleCount: number;
  sampleSpreadMeters: number;
};

export type ClockGpsVerifyPhase =
  | "checking"
  | "verified"
  | "weak_indoor"
  | "too_far"
  | "unstable"
  | "error";

export type ClockGpsVerifySnapshot = {
  phase: ClockGpsVerifyPhase;
  verifyTier: GpsVerifyTier | null;
  error: string | null;
  tooFarMessage: string | null;
  verified: VerifiedGps | null;
  verifiedViaLabel: string | null;
  distanceMeters: number | null;
  accuracyMeters: number | null;
  sampleCount: number;
  sampleSpreadMeters: number;
  isCheckingLocation: boolean;
  reviewRequired: boolean;
  indoorSessionUsed: boolean;
};

const INITIAL_SNAPSHOT: ClockGpsVerifySnapshot = {
  phase: "checking",
  verifyTier: null,
  error: null,
  tooFarMessage: null,
  verified: null,
  verifiedViaLabel: null,
  distanceMeters: null,
  accuracyMeters: null,
  sampleCount: 0,
  sampleSpreadMeters: 0,
  isCheckingLocation: false,
  reviewRequired: false,
  indoorSessionUsed: false,
};

const CHECKING_STUCK_MS = GPS_PREPARE_STUCK_MS + 8_000;

let cachedSnapshot: ClockGpsVerifySnapshot = INITIAL_SNAPSHOT;

let activeShop: ShopForPunch | null = null;
let verified: VerifiedGps | null = null;
let phase: ClockGpsVerifyPhase = "checking";
let verifyTier: GpsVerifyTier | null = null;
let verifyError: string | null = null;
let tooFarMessage: string | null = null;
let distanceMeters: number | null = null;
let accuracyMeters: number | null = null;
let sampleCount = 0;
let sampleSpreadMeters = 0;
let verifiedViaLabel: string | null = null;
let isCheckingLocation = false;
let checkingStartedAt = 0;
let reviewRequired = false;
let indoorSessionUsed = false;
let stopGpsService: (() => void) | null = null;
let pollId: number | null = null;
let stuckVerifyTimer: number | null = null;
let unsubGpsCache: (() => void) | null = null;
let verifyListeners = new Set<() => void>();

let gpsRequestIdCounter = 0;
let activeGpsRequestId = 0;
let refreshInFlight: Promise<void> | null = null;

function verifyLog(event: string, detail?: Record<string, unknown>): void {
  if (detail) {
    console.log(`[gps-verify] ${event}`, detail);
  } else {
    console.log(`[gps-verify] ${event}`);
  }
}

function isCurrentGpsRequest(requestId: number): boolean {
  return requestId === activeGpsRequestId;
}

function beginGpsRequest(): number {
  activeGpsRequestId = ++gpsRequestIdCounter;
  return activeGpsRequestId;
}

function buildSnapshot(): ClockGpsVerifySnapshot {
  return {
    phase,
    verifyTier,
    error: verifyError,
    tooFarMessage,
    verified,
    verifiedViaLabel,
    distanceMeters,
    accuracyMeters,
    sampleCount,
    sampleSpreadMeters,
    isCheckingLocation,
    reviewRequired,
    indoorSessionUsed,
  };
}

function snapshotsEqual(a: ClockGpsVerifySnapshot, b: ClockGpsVerifySnapshot): boolean {
  if (a.phase !== b.phase) return false;
  if (a.verifyTier !== b.verifyTier) return false;
  if (a.error !== b.error) return false;
  if (a.tooFarMessage !== b.tooFarMessage) return false;
  if (a.distanceMeters !== b.distanceMeters) return false;
  if (a.accuracyMeters !== b.accuracyMeters) return false;
  if (a.isCheckingLocation !== b.isCheckingLocation) return false;
  if (a.verifiedViaLabel !== b.verifiedViaLabel) return false;
  if (a.sampleCount !== b.sampleCount) return false;
  if (a.sampleSpreadMeters !== b.sampleSpreadMeters) return false;
  if (a.reviewRequired !== b.reviewRequired) return false;
  if (a.indoorSessionUsed !== b.indoorSessionUsed) return false;
  const av = a.verified;
  const bv = b.verified;
  if (av === bv) return true;
  if (!av || !bv) return false;
  return (
    av.latitude === bv.latitude &&
    av.longitude === bv.longitude &&
    av.accuracyMeters === bv.accuracyMeters &&
    av.cachedAt === bv.cachedAt &&
    av.distanceMeters === bv.distanceMeters &&
    av.matchedLocationId === bv.matchedLocationId &&
    av.matchedLocationName === bv.matchedLocationName &&
    av.verifyTier === bv.verifyTier
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

function phaseFromTier(tier: GpsVerifyTier, spread: number, allowsPunch: boolean): ClockGpsVerifyPhase {
  if (!allowsPunch) {
    if (spread > GPS_UNSTABLE_SPREAD_M) return "unstable";
    return "too_far";
  }
  if (tier === "weak_indoor" || tier === "review_required") return "weak_indoor";
  return "verified";
}

function persistSession(shop: ShopForPunch, v: VerifiedGps): void {
  const session: IndoorGpsSession = {
    shopId: shop.id,
    latitude: v.latitude,
    longitude: v.longitude,
    accuracyMeters: v.accuracyMeters,
    verifyTier: v.verifyTier,
    matchedLocationId: v.matchedLocationId.startsWith("legacy-") ? null : v.matchedLocationId,
    savedAt: Date.now(),
  };
  saveIndoorGpsSession(session);
}

function applyVerificationFromCache(requestId: number) {
  if (!isCurrentGpsRequest(requestId) || !activeShop) return;

  try {
    const prepare = getLocationPrepareSnapshot();
    const fresh = getCachedGpsPosition();
    const cached = fresh ?? getCachedGpsPositionForDisplay();
    const meta = getGpsSampleMeta();

    if (!cached && prepare.status === "error") {
      phase = "error";
      verifyTier = null;
      verifyError = prepare.error ?? GPS_UNAVAILABLE_MSG;
      tooFarMessage = null;
      verified = null;
      verifiedViaLabel = null;
      distanceMeters = null;
      accuracyMeters = null;
      sampleCount = 0;
      sampleSpreadMeters = 0;
      reviewRequired = false;
      indoorSessionUsed = false;
      verifyLog("verify error (no cache)", { error: verifyError });
      notifyVerify();
      return;
    }

    if (!cached) {
      phase = "checking";
      verifyTier = null;
      verifyError = null;
      tooFarMessage = null;
      verified = null;
      verifiedViaLabel = null;
      distanceMeters = null;
      accuracyMeters = null;
      sampleCount = meta.sampleCount;
      sampleSpreadMeters = meta.sampleSpreadMeters;
      reviewRequired = false;
      indoorSessionUsed = false;
      notifyVerify();
      return;
    }

    accuracyMeters = cached.accuracyMeters;
    sampleCount = cached.sampleCount ?? meta.sampleCount;
    sampleSpreadMeters = cached.sampleSpreadMeters ?? meta.sampleSpreadMeters;

    const session = readIndoorGpsSession(activeShop.id);
    const check = checkGpsAgainstLocations(
      activeShop.locations,
      cached.latitude,
      cached.longitude,
      cached.accuracyMeters,
      {
        sampleCount,
        sampleSpreadM: sampleSpreadMeters,
        indoorSession: session,
        shopIndoorMode: activeShop.gpsIndoorMode,
      },
    );

    distanceMeters = check.distanceM;
    verifyTier = check.verifyTier;
    reviewRequired = check.reviewRequired;
    indoorSessionUsed = check.indoorSessionUsed;

    verifyLog("distance computed", {
      distanceM: Math.round(check.distanceM),
      effectiveRadiusM: Math.round(check.effectiveRadiusM),
      tier: check.verifyTier,
      allowsPunch: check.allowsPunch,
      accuracyM: Math.round(cached.accuracyMeters),
      spreadM: sampleSpreadMeters,
      usingStaleDisplay: !fresh && !!cached,
    });

    if (check.allowsPunch) {
      const loc = check.matchedLocation;
      phase = phaseFromTier(check.verifyTier, sampleSpreadMeters, true);
      verifyError = null;
      tooFarMessage = null;
      verifiedViaLabel = loc ? formatVerifiedViaLabel(loc.name) : "Location verified";
      verified = {
        ...cached,
        distanceMeters: Math.round(check.distanceM * 100) / 100,
        gpsVerified: true,
        verifyTier: check.verifyTier,
        reviewRequired: check.reviewRequired,
        indoorSessionUsed: check.indoorSessionUsed,
        matchedLocationId: loc?.id ?? `legacy-${activeShop.id}`,
        matchedLocationName: loc?.name ?? "Shop",
        matchedLocationType: loc?.location_type ?? "main",
        sampleCount,
        sampleSpreadMeters,
      };
      persistSession(activeShop, verified);
    } else {
      phase = phaseFromTier(check.verifyTier, sampleSpreadMeters, false);
      verifyError = null;
      tooFarMessage =
        phase === "unstable"
          ? "GPS is unstable indoors. Stay still and tap Refresh Location."
          : TOO_FAR_MSG;
      verified = null;
      verifiedViaLabel = null;
    }
    notifyVerify();
  } catch (e) {
    phase = "error";
    verifyTier = null;
    verifyError = e instanceof Error ? e.message : "Could not verify location";
    verified = null;
    verifyLog("verify exception", { error: verifyError });
    notifyVerify();
  }
}

function recomputeVerification() {
  if (!activeShop) return;
  applyVerificationFromCache(activeGpsRequestId);
}

function onGpsCacheUpdate() {
  applyVerificationFromCache(activeGpsRequestId);
}

function checkVerificationStuck() {
  if (!activeShop) return;

  const prepare = getLocationPrepareSnapshot();
  const now = Date.now();

  if (isCheckingLocation && checkingStartedAt > 0 && now - checkingStartedAt > CHECKING_STUCK_MS) {
    verifyLog("checking stuck watchdog — forcing refresh restart");
    isCheckingLocation = false;
    checkingStartedAt = 0;
    refreshInFlight = null;
    void refreshClockGpsVerification();
    return;
  }

  if (
    phase === "checking" &&
    !getCachedGpsPositionForDisplay() &&
    prepare.status === "preparing" &&
    !isCheckingLocation
  ) {
    verifyLog("checking with no cache too long — hard restart");
    hardRestartLocationService();
    recomputeVerification();
  }
}

export function subscribeClockGpsVerify(listener: () => void): () => void {
  verifyListeners.add(listener);
  return () => verifyListeners.delete(listener);
}

export function getClockGpsVerifySnapshot(): ClockGpsVerifySnapshot {
  return cachedSnapshot;
}

export function getClockGpsVerifyServerSnapshot(): ClockGpsVerifySnapshot {
  return INITIAL_SNAPSHOT;
}

export function isGpsVerifiedForPunch(): boolean {
  return (
    (phase === "verified" || phase === "weak_indoor") &&
    verified != null &&
    verified.verifyTier !== "rejected"
  );
}

export function shouldOfferLocationRefresh(snap: ClockGpsVerifySnapshot): boolean {
  if (snap.isCheckingLocation) return true;
  if (snap.phase === "too_far" || snap.phase === "error" || snap.phase === "unstable") return true;
  if (snap.phase === "checking") return true;
  if (
    snap.accuracyMeters != null &&
    Number.isFinite(snap.accuracyMeters) &&
    snap.accuracyMeters > GPS_WEAK_ACCURACY_METERS
  ) {
    return true;
  }
  if (snap.phase === "weak_indoor" || snap.reviewRequired) return true;
  return false;
}

export function getVerifiedGpsForPunch(): VerifiedGps {
  if (!verified || !isGpsVerifiedForPunch()) {
    throw new Error("Location is not verified. Wait until you are within shop range.");
  }
  return verified;
}

/**
 * Manual refresh — always restarts GPS (supersedes in-flight refresh).
 */
export function refreshClockGpsVerification(): Promise<void> {
  if (typeof window === "undefined" || !activeShop) {
    return Promise.resolve();
  }

  const requestId = beginGpsRequest();
  verifyLog("refresh start (full restart)", { requestId });

  refreshInFlight = null;
  isCheckingLocation = true;
  checkingStartedAt = Date.now();
  phase = "checking";
  verifyTier = null;
  verifyError = null;
  tooFarMessage = null;
  verified = null;
  verifiedViaLabel = null;
  distanceMeters = null;
  accuracyMeters = null;
  notifyVerify();

  refreshInFlight = (async () => {
    try {
      await forceRefreshGpsPosition();

      if (!isCurrentGpsRequest(requestId)) {
        verifyLog("refresh stale (superseded)", { requestId });
        return;
      }

      applyVerificationFromCache(requestId);

      const snap = getClockGpsVerifySnapshot();
      verifyLog("refresh done", {
        requestId,
        phase: snap.phase,
        tier: snap.verifyTier,
        distance: snap.distanceMeters,
        accuracy: snap.accuracyMeters,
        spread: snap.sampleSpreadMeters,
      });
    } catch (e) {
      if (!isCurrentGpsRequest(requestId)) return;

      phase = "error";
      verifyTier = null;
      verifyError = e instanceof Error ? e.message : GPS_UNAVAILABLE_MSG;
      tooFarMessage = null;
      verified = null;
      verifyLog("refresh failed", {
        requestId,
        error: verifyError,
      });
      notifyVerify();
    } finally {
      if (isCurrentGpsRequest(requestId)) {
        isCheckingLocation = false;
        checkingStartedAt = 0;
        notifyVerify();
      }
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/**
 * Start GPS + shop distance verification. Always restarts service (page reopen safe).
 */
export function startClockGpsVerification(shop: ShopForPunch): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  if (stopGpsService) {
    stopGpsService();
    stopGpsService = null;
  }
  if (unsubGpsCache) {
    unsubGpsCache();
    unsubGpsCache = null;
  }
  if (pollId != null) {
    window.clearInterval(pollId);
    pollId = null;
  }
  if (stuckVerifyTimer != null) {
    window.clearInterval(stuckVerifyTimer);
    stuckVerifyTimer = null;
  }

  beginGpsRequest();
  activeShop = shop;
  phase = "checking";
  verifyTier = null;
  verifyError = null;
  tooFarMessage = null;
  verified = null;
  verifiedViaLabel = null;
  isCheckingLocation = false;
  checkingStartedAt = 0;
  refreshInFlight = null;
  notifyVerify();

  verifyLog("clock GPS verification start", { shopId: shop.id, points: shop.locations.length });

  stopGpsService = startPreparedLocationService();
  unsubGpsCache = subscribeGpsCache(onGpsCacheUpdate);
  recomputeVerification();

  pollId = window.setInterval(() => {
    recomputeVerification();
  }, 1000);

  stuckVerifyTimer = window.setInterval(checkVerificationStuck, 3000);

  return () => {
    if (pollId != null) window.clearInterval(pollId);
    pollId = null;
    if (stuckVerifyTimer != null) window.clearInterval(stuckVerifyTimer);
    stuckVerifyTimer = null;
    unsubGpsCache?.();
    unsubGpsCache = null;
    if (stopGpsService) {
      stopGpsService();
      stopGpsService = null;
    }
    activeShop = null;
    verified = null;
    phase = "checking";
    isCheckingLocation = false;
    checkingStartedAt = 0;
    refreshInFlight = null;
    commitSnapshot(INITIAL_SNAPSHOT);
    notifyVerify();
    verifyLog("clock GPS verification stopped");
  };
}

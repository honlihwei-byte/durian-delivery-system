import { randomBytes } from "crypto";

// Short customer-facing code, e.g. MK-563FF199 (matches last 8 chars of order id).
export const TRACKING_CODE_PATTERN = /^MK-[A-F0-9]{8}$/i;

// Legacy tokens: 64-char lowercase hex or 43-char base64url.
const HEX_TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const BASE64URL_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateTrackingToken(): string {
  return randomBytes(32).toString("hex");
}

export function decodeTrackingRef(ref: string): string {
  try {
    return decodeURIComponent(ref).trim();
  } catch {
    return ref.trim();
  }
}

export function normalizeTrackingCode(ref: string): string {
  const decoded = decodeTrackingRef(ref);
  if (TRACKING_CODE_PATTERN.test(decoded)) {
    return decoded.toUpperCase();
  }
  return decoded;
}

export function normalizeTrackingToken(token: string): string {
  return decodeTrackingRef(token);
}

export function normalizeTrackingRef(ref: string): string {
  const decoded = decodeTrackingRef(ref);
  if (TRACKING_CODE_PATTERN.test(decoded)) {
    return decoded.toUpperCase();
  }
  return decoded;
}

export function isValidTrackingCode(ref: string): boolean {
  return TRACKING_CODE_PATTERN.test(normalizeTrackingRef(ref));
}

export function isValidTrackingToken(token: string): boolean {
  const normalized = normalizeTrackingToken(token);
  return (
    HEX_TOKEN_PATTERN.test(normalized) ||
    BASE64URL_TOKEN_PATTERN.test(normalized)
  );
}

export function isValidTrackingRef(ref: string): boolean {
  return isValidTrackingCode(ref) || isValidTrackingToken(ref);
}

export function formatOrderNumber(orderId: string): string {
  return orderId.replace(/-/g, "").slice(-8).toUpperCase();
}

export function formatTrackingCode(orderId: string): string {
  return `MK-${formatOrderNumber(orderId)}`;
}

function toOrigin(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return null;

  // If someone configured a full tracking URL (or any path),
  // always reduce it to the origin to prevent nested /track/.../track/... links.
  try {
    return new URL(trimmed).origin;
  } catch {
    // If scheme is missing, attempt https:// as a last resort.
    try {
      return new URL(`https://${trimmed.replace(/^https?:\/\//, "")}`).origin;
    } catch {
      return null;
    }
  }
}

export function getTrackingUrl(trackingCode: string, origin?: string): string {
  const pathSegment = encodeURIComponent(normalizeTrackingRef(trackingCode));
  const base =
    toOrigin(process.env.NEXT_PUBLIC_APP_URL ?? "") ?? toOrigin(origin ?? "");

  if (!base) {
    return `/track/${pathSegment}`;
  }

  return `${base}/track/${pathSegment}`;
}

export function getTrackingApiPath(ref: string): string {
  return `/api/track/${encodeURIComponent(normalizeTrackingRef(ref))}`;
}

export function getWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

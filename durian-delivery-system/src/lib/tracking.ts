import { randomBytes } from "crypto";

const TRACKING_TOKEN_BYTES = 32;
const TRACKING_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateTrackingToken(): string {
  return randomBytes(TRACKING_TOKEN_BYTES).toString("base64url");
}

export function isValidTrackingToken(token: string): boolean {
  return TRACKING_TOKEN_PATTERN.test(token);
}

export function formatOrderNumber(orderId: string): string {
  return orderId.replace(/-/g, "").slice(-8).toUpperCase();
}

export function getTrackingUrl(token: string, origin?: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    origin?.replace(/\/$/, "") ??
    "";

  if (!base) {
    return `/track/${token}`;
  }

  return `${base}/track/${token}`;
}

export function getWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

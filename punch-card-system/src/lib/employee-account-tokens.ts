import { createHash, randomBytes } from "crypto";

export const ACTIVATION_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export function generateAccountToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAccountToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function activationExpiresAt(from = Date.now()): string {
  return new Date(from + ACTIVATION_TOKEN_TTL_MS).toISOString();
}

export function resetExpiresAt(from = Date.now()): string {
  return new Date(from + RESET_TOKEN_TTL_MS).toISOString();
}

export function buildActivationUrl(origin: string, rawToken: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/employee/activate?token=${encodeURIComponent(rawToken)}`;
}

export function buildResetUrl(origin: string, rawToken: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/employee/reset-password?token=${encodeURIComponent(rawToken)}`;
}

export function requestOrigin(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

/**
 * Canonical base URL for all user-facing links (emails, activation, login, QR, billing).
 *
 * Configure in production:
 *   APP_BASE_URL=https://lwopsflow.com
 *   NEXT_PUBLIC_APP_URL=https://lwopsflow.com
 *
 * Development default: http://localhost:3000
 *
 * Never use VERCEL_URL or request origin for generated links — preview URLs must not leak.
 */

export const DEFAULT_APP_BASE_URL = "https://lwopsflow.com";
export const DEV_APP_BASE_URL = "http://localhost:3000";

/** @deprecated Use DEFAULT_APP_BASE_URL — marketing and app share one domain. */
export const DEFAULT_MARKETING_URL = DEFAULT_APP_BASE_URL;

/** @deprecated Use DEFAULT_APP_BASE_URL */
export const DEFAULT_APP_URL = DEFAULT_APP_BASE_URL;

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function readConfiguredAppBaseUrl(): string | null {
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (publicUrl) return normalizeBaseUrl(publicUrl);

  const serverUrl = process.env.APP_BASE_URL?.trim();
  if (serverUrl) return normalizeBaseUrl(serverUrl);

  return null;
}

/**
 * Single source of truth for absolute URLs across server and client bundles.
 * Client code only sees NEXT_PUBLIC_APP_URL (inlined at build time).
 */
export function getAppBaseUrl(): string {
  const configured = readConfiguredAppBaseUrl();
  if (configured) return configured;

  if (process.env.NODE_ENV === "development") {
    return DEV_APP_BASE_URL;
  }

  return DEFAULT_APP_BASE_URL;
}

/** Alias — employee portal links use the same base URL as company admin. */
export function getEmployeeAppBaseUrl(): string {
  return getAppBaseUrl();
}

export function getMarketingBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_MARKETING_URL?.trim();
  if (explicit) return normalizeBaseUrl(explicit);
  return getAppBaseUrl();
}

/** Hostnames that serve short employee paths (/login rewrites to /employee/login). */
export function isEmployeeAppHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  if (h === "localhost" || h === "127.0.0.1") return false;

  if (h === "app.lwopsflow.com") return true;
  if (h.startsWith("app.") && h.endsWith(".lwopsflow.com")) return true;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      const appHost = new URL(appUrl).hostname.toLowerCase();
      if (appHost.startsWith("app.") && appHost !== "localhost" && appHost !== "127.0.0.1") {
        return appHost === h;
      }
    } catch {
      /* ignore */
    }
  }

  return false;
}

export function getEmployeeLoginUrl(): string {
  return `${getAppBaseUrl()}${getEmployeeLoginPathForLinks()}`;
}

/** Path used in generated login links (works on shared and app subdomains). */
export function getEmployeeLoginPathForLinks(): string {
  return "/employee/login";
}

export function getEmployeeLoginPath(): string {
  return "/login";
}

export function getEmployeeActivatePath(token: string): string {
  return `/activate/${encodeURIComponent(token)}`;
}

export function getEmployeeActivateUrl(token: string): string {
  return `${getAppBaseUrl()}${getEmployeeActivatePath(token)}`;
}

export function getAuthEmailRedirectUrl(path: string): string {
  const base = getAppBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** Build an absolute URL for any app path. */
export function buildAppUrl(path: string): string {
  return getAuthEmailRedirectUrl(path);
}

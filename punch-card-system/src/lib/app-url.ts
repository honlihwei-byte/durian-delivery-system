/**
 * Canonical URLs for LW OpsFlow.
 *
 * Marketing site: https://lwopsflow.com
 * Application:    https://app.lwopsflow.com
 *
 * Set in Vercel production:
 *   NEXT_PUBLIC_APP_URL=https://app.lwopsflow.com
 *   NEXT_PUBLIC_MARKETING_URL=https://lwopsflow.com
 */

export const DEFAULT_MARKETING_URL = "https://lwopsflow.com";
export const DEFAULT_APP_URL = "https://app.lwopsflow.com";

export function getMarketingBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_MARKETING_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return DEFAULT_MARKETING_URL;
}

/**
 * Base URL for the employee application (portal, activation, employee login).
 * Never falls back to VERCEL_URL — user-facing links must not expose preview URLs.
 */
export function getEmployeeAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  return DEFAULT_APP_URL;
}

/**
 * Base URL for company-admin auth emails and billing redirects.
 * Preview deployments may use VERCEL_URL when APP_URL is unset.
 */
export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

/** Hostnames that serve the employee app (short /login, /activate paths). */
export function isEmployeeAppHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  if (h === "localhost" || h === "127.0.0.1") return false;
  if (h === "app.lwopsflow.com") return true;
  if (h.startsWith("app.")) return true;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      const appHost = new URL(appUrl).hostname.toLowerCase();
      if (appHost !== "localhost" && appHost !== "127.0.0.1") {
        return appHost === h;
      }
    } catch {
      /* ignore */
    }
  }
  return false;
}

export function getEmployeeLoginUrl(): string {
  return `${getEmployeeAppBaseUrl()}/login`;
}

export function getEmployeeLoginPath(): string {
  return "/login";
}

export function getEmployeeActivatePath(token: string): string {
  return `/activate/${encodeURIComponent(token)}`;
}

export function getEmployeeActivateUrl(token: string): string {
  return `${getEmployeeAppBaseUrl()}${getEmployeeActivatePath(token)}`;
}

export function getAuthEmailRedirectUrl(path: string): string {
  const base = getAppBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

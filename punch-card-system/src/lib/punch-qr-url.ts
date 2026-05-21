/** Client-safe clock URL builder (no Node crypto). */

export function buildClockUrlWithToken(origin: string, shopId: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  const qs = new URLSearchParams({ t: token });
  return `${base}/shop/${encodeURIComponent(shopId)}/clock?${qs.toString()}`;
}

export function normalizePunchQrToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t || t.length > 128) return null;
  return t;
}

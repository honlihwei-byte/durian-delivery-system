/**
 * Parse optional client_device_time from punch body (audit only — never used as official time).
 */
export function parseClientDeviceTime(body: Record<string, unknown>): string | null {
  const raw = body.client_device_time;
  if (raw == null || raw === "") return null;
  const iso = typeof raw === "string" ? raw.trim() : String(raw).trim();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

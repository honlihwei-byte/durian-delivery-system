/** Official display / business timezone for attendance reports. */
export const MALAYSIA_TZ = "Asia/Kuala_Lumpur";

const DEVICE_MISMATCH_THRESHOLD_SEC = 5 * 60;

/** Format an ISO UTC timestamp for admin display in Malaysia time. */
export function formatMalaysiaDateTime(isoUtc: string | null | undefined): string {
  if (!isoUtc) return "—";
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: MALAYSIA_TZ,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}

/** Clock time label with MYT suffix (event_time is already stored in MYT wall time). */
export function formatEventTimeMalaysia(eventTime: string): string {
  return `${eventTime} MYT`;
}

/** True when device clock differed from server by more than 5 minutes. */
export function isDeviceTimeMismatch(timeDifferenceSeconds: number | null | undefined): boolean {
  if (timeDifferenceSeconds == null || !Number.isFinite(timeDifferenceSeconds)) return false;
  return timeDifferenceSeconds > DEVICE_MISMATCH_THRESHOLD_SEC;
}

export const DEVICE_TIME_MISMATCH_LABEL = "Device time mismatch";

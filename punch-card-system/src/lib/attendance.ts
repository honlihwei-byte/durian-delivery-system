import { malaysiaDateYmd } from "@/lib/malaysia-time";
import {
  isIndoorConfidenceMethod,
  isIndoorFallbackMethod,
  isLegacyGpsVerified,
  isPhotoProofMethod,
} from "@/lib/verification-method";

export type AttendanceRecord = {
  id: string;
  shop_id: string;
  shop_name: string;
  staff_id: string;
  staff_name: string;
  staff_code: string;
  staff_type: string;
  action_type: "clock_in" | "clock_out";
  event_date: string;
  event_time: string;
  staff_latitude?: number | null;
  staff_longitude?: number | null;
  distance_from_shop_meters?: number | null;
  gps_accuracy_meters?: number | null;
  gps_verified?: boolean | null;
  gps_verify_tier?: string | null;
  gps_review_required?: boolean | null;
  location_confidence_score?: number | null;
  gps_indoor_fallback_used?: boolean | null;
  photo_proof_used?: boolean | null;
  photo_proof_path?: string | null;
  verification_method?: string | null;
  review_required?: boolean | null;
  client_device_time?: string | null;
  created_at: string;
};

export type GpsStatusLabel =
  | "Verified"
  | "Weak Indoor"
  | "Expanded Radius"
  | "Rejected"
  | "Review Required"
  | "Photo Proof"
  | "Location not available";

export function gpsStatusClassName(status: GpsStatusLabel): string {
  switch (status) {
    case "Verified":
      return "text-emerald-700 dark:text-emerald-300";
    case "Weak Indoor":
      return "text-amber-700 dark:text-amber-300";
    case "Expanded Radius":
      return "text-sky-700 dark:text-sky-300";
    case "Review Required":
      return "text-orange-700 dark:text-orange-300";
    case "Photo Proof":
      return "text-violet-700 dark:text-violet-300";
    case "Rejected":
      return "text-red-700 dark:text-red-300";
    default:
      return "text-zinc-500";
  }
}

export function gpsStatusLabel(record: AttendanceRecord): GpsStatusLabel {
  if (record.photo_proof_used || isPhotoProofMethod(record.verification_method)) {
    return "Photo Proof";
  }
  if (isIndoorFallbackMethod(record.verification_method, record.gps_indoor_fallback_used)) {
    return "Expanded Radius";
  }
  if (record.staff_latitude == null || record.staff_longitude == null) {
    return "Location not available";
  }
  const tier = record.gps_verify_tier;
  if (tier === "verified" || isLegacyGpsVerified(record.verification_method)) return "Verified";
  if (tier === "weak_indoor" || isIndoorConfidenceMethod(record.verification_method)) {
    return "Weak Indoor";
  }
  if (record.review_required || tier === "review_required") return "Review Required";
  if (tier === "rejected") return "Rejected";
  if (record.gps_review_required) return "Review Required";
  if (record.gps_verified) return "Verified";
  return "Rejected";
}

export function formatGpsDistanceMeters(m: number | null | undefined): string {
  if (m == null || !Number.isFinite(m)) return "—";
  return `${Math.round(m)} m`;
}

/** True when staff has at least one countable punch in the row set. */
export function staffHasPunchRows(rows: AttendanceRecord[]): boolean {
  return attendanceForTotals(rows).length > 0;
}

/** Rows that count toward hours and presence (verified GPS or legacy without GPS fields). */
export function attendanceForTotals(rows: AttendanceRecord[]): AttendanceRecord[] {
  return rows.filter((r) => {
    if (r.photo_proof_used) return true;
    if (r.staff_latitude == null && r.staff_longitude == null) return true;
    return r.gps_verified === true;
  });
}

/** Authoritative instant for duration math (row created_at from database). */
function eventInstant(p: AttendanceRecord): number {
  return new Date(p.created_at).getTime();
}

export function sortByCreatedAt(rows: AttendanceRecord[]): AttendanceRecord[] {
  return [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

/** Sum completed in→out segments for one calendar day (caller filters rows to that day). */
export function totalWorkedMsForDay(rows: AttendanceRecord[]): number {
  const sorted = sortByCreatedAt(attendanceForTotals(rows));
  let openIn: number | null = null;
  let total = 0;
  for (const p of sorted) {
    if (p.action_type === "clock_in") {
      openIn = eventInstant(p);
    } else {
      const out = eventInstant(p);
      if (openIn !== null) {
        total += Math.max(0, out - openIn);
        openIn = null;
      }
    }
  }
  return total;
}

export function firstClockIn(rows: AttendanceRecord[]): AttendanceRecord | undefined {
  const ins = sortByCreatedAt(attendanceForTotals(rows)).filter((p) => p.action_type === "clock_in");
  return ins[0];
}

export function lastClockOut(rows: AttendanceRecord[]): AttendanceRecord | undefined {
  const outs = sortByCreatedAt(attendanceForTotals(rows)).filter((p) => p.action_type === "clock_out");
  return outs.length ? outs[outs.length - 1] : undefined;
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "0h 0m";
  const totalM = Math.floor(ms / 60000);
  const h = Math.floor(totalM / 60);
  const m = totalM % 60;
  return `${h}h ${m}m`;
}

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function weekRangeMondayStart(weekStartYmd: string): string[] {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) days.push(addDaysYmd(weekStartYmd, i));
  return days;
}

/** Monday of the week containing `ymd` (local calendar). */
export function mondayOfWeekContaining(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export type DayShopStatus = "in_shop" | "out" | "missing_clock_out";

/** In-shop status for a single calendar day (Malaysia date). */
export function dayShopStatusFromRows(
  rows: AttendanceRecord[],
  dateYmd: string,
): DayShopStatus | null {
  const counted = attendanceForTotals(rows);
  if (counted.length === 0) return null;
  const sorted = sortByCreatedAt(counted);
  const last = sorted[sorted.length - 1];
  if (last.action_type === "clock_out") return "out";
  if (last.action_type === "clock_in") {
    const today = malaysiaDateYmd(new Date());
    return dateYmd === today ? "in_shop" : "missing_clock_out";
  }
  return null;
}

/** Last verified punch still open (clock in without matching out). */
export function punchIssueForDay(rows: AttendanceRecord[]): string | null {
  const counted = attendanceForTotals(rows);
  if (counted.length === 0) return null;
  const sorted = sortByCreatedAt(counted);
  const last = sorted[sorted.length - 1];
  if (last.action_type === "clock_in") return "Missing clock out";
  return null;
}

export function shopNamesVisited(rows: AttendanceRecord[]): string {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const r of sortByCreatedAt(attendanceForTotals(rows))) {
    const n = r.shop_name.trim();
    if (n && !seen.has(n)) {
      seen.add(n);
      order.push(n);
    }
  }
  return order.join(", ") || "—";
}

import type { AttendanceRecord } from "@/lib/attendance";
import {
  attendanceForTotals,
  recordEventInstant,
  sortByEventTime,
} from "@/lib/attendance";
import { recordEventTime } from "@/lib/attendance-db";
import type { ForgotPunchRequestRow } from "@/lib/forgot-punch";
import { malaysiaDateYmd, malaysiaTimeHms, parseMalaysiaEventInstant } from "@/lib/malaysia-time";

export type ForgotPunchApprovalValidation =
  | { ok: true; pairedClockInId?: string }
  | { ok: false; error: string };

function requestedEventMs(request: ForgotPunchRequestRow): number {
  const requestedAt = new Date(request.requested_time);
  if (Number.isNaN(requestedAt.getTime())) return NaN;
  const fromIso = parseMalaysiaEventInstant(
    malaysiaDateYmd(requestedAt),
    malaysiaTimeHms(requestedAt),
  );
  return fromIso ?? requestedAt.getTime();
}

/** Unmatched clock_in immediately before `beforeMs` (by event_time order). */
export function findOpenClockInBefore(
  rows: AttendanceRecord[],
  beforeMs: number,
): AttendanceRecord | null {
  const sorted = sortByEventTime(attendanceForTotals(rows));
  let openIn: AttendanceRecord | null = null;
  for (const row of sorted) {
    const t = recordEventInstant(row);
    if (t > beforeMs) break;
    if (row.action_type === "clock_in") openIn = row;
    else if (row.action_type === "clock_out") openIn = null;
  }
  return openIn;
}

export function validateForgotPunchApproval(
  request: ForgotPunchRequestRow,
  staffRows: AttendanceRecord[],
): ForgotPunchApprovalValidation {
  const targetMs = requestedEventMs(request);
  if (Number.isNaN(targetMs)) {
    return { ok: false, error: "Invalid requested time." };
  }

  if (request.request_type === "forgot_clock_out") {
    const openIn = findOpenClockInBefore(staffRows, targetMs);
    if (!openIn) {
      return { ok: false, error: "No open clock in found for this staff." };
    }
    const inMs = recordEventInstant(openIn);
    if (targetMs <= inMs) {
      return {
        ok: false,
        error: `Clock out time must be after the latest clock in (${recordEventTime(openIn).slice(0, 8)}).`,
      };
    }
    return { ok: true, pairedClockInId: openIn.id };
  }

  const sorted = sortByEventTime(attendanceForTotals(staffRows));
  const nextOut = sorted.find(
    (r) => r.action_type === "clock_out" && recordEventInstant(r) > targetMs,
  );
  if (nextOut) {
    const outMs = recordEventInstant(nextOut);
    if (targetMs >= outMs) {
      return {
        ok: false,
        error: `Clock in time must be before the next clock out (${recordEventTime(nextOut).slice(0, 8)}).`,
      };
    }
  }

  const openIn = findOpenClockInBefore(staffRows, Number.MAX_SAFE_INTEGER);
  if (openIn && recordEventInstant(openIn) >= targetMs) {
    return {
      ok: false,
      error: "An open clock in already exists at or after this time.",
    };
  }

  return { ok: true };
}

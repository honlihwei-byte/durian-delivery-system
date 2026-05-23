import {
  attendanceForTotals,
  sortByEventTime,
  type AttendanceRecord,
} from "@/lib/attendance";
import { recordEventTime } from "@/lib/attendance-db";

export const DUPLICATE_PREVENTED_AUDIT_PREFIX = "Duplicate prevented:";
export const SMART_PUNCH_DUPLICATE_WINDOW_MS = 5_000;

export type SmartPunchSessionState = "not_active" | "active";

export type SmartPunchBlockCode =
  | "already_clocked_in"
  | "already_clocked_out"
  | "duplicate_prevented";

export type SmartPunchValidation =
  | { ok: true; session: SmartPunchSessionState; expectedAction: "clock_in" | "clock_out" }
  | {
      ok: false;
      code: SmartPunchBlockCode;
      message: string;
      guardNote: string;
    };

export function isDuplicatePreventedGuardRow(row: AttendanceRecord): boolean {
  return Boolean(row.audit_notes?.startsWith(DUPLICATE_PREVENTED_AUDIT_PREFIX));
}

/** Active session: latest counted punch is clock in (no matching clock out yet). */
export function smartPunchSessionState(rows: AttendanceRecord[]): SmartPunchSessionState {
  const counted = attendanceForTotals(rows);
  if (counted.length === 0) return "not_active";
  const sorted = sortByEventTime(counted);
  const last = sorted[sorted.length - 1]!;
  return last.action_type === "clock_in" ? "active" : "not_active";
}

export function smartPunchExpectedAction(
  session: SmartPunchSessionState,
): "clock_in" | "clock_out" {
  return session === "active" ? "clock_out" : "clock_in";
}

export function lastClockInRecord(rows: AttendanceRecord[]): AttendanceRecord | undefined {
  const ins = sortByEventTime(attendanceForTotals(rows)).filter((r) => r.action_type === "clock_in");
  return ins.length > 0 ? ins[ins.length - 1] : undefined;
}

export function validateSmartPunch(
  actionType: "clock_in" | "clock_out",
  rows: AttendanceRecord[],
  shopName: string,
  duplicateWindowMs: number = SMART_PUNCH_DUPLICATE_WINDOW_MS,
): SmartPunchValidation {
  const session = smartPunchSessionState(rows);
  const expectedAction = smartPunchExpectedAction(session);

  if (actionType === "clock_in" && session === "active") {
    const lastIn = lastClockInRecord(rows);
    const timeLabel = lastIn ? recordEventTime(lastIn).slice(0, 8) : "—";
    const atShop = lastIn?.shop_name?.trim() || shopName;
    return {
      ok: false,
      code: "already_clocked_in",
      message: `You are already clocked in. Last clock in: ${timeLabel} at ${atShop}.`,
      guardNote: `${DUPLICATE_PREVENTED_AUDIT_PREFIX} Already clocked in (attempted clock in).`,
    };
  }

  if (actionType === "clock_out" && session === "not_active") {
    return {
      ok: false,
      code: "already_clocked_out",
      message: "You are already clocked out.",
      guardNote: `${DUPLICATE_PREVENTED_AUDIT_PREFIX} Already clocked out (attempted clock out).`,
    };
  }

  const counted = attendanceForTotals(rows);
  if (counted.length > 0) {
    const sorted = sortByEventTime(counted);
    const last = sorted[sorted.length - 1]!;
    if (last.action_type === actionType) {
      const elapsed = Date.now() - new Date(last.created_at).getTime();
      if (elapsed < duplicateWindowMs) {
        const label = actionType === "clock_in" ? "Clock In" : "Clock Out";
        const timeLabel = recordEventTime(last).slice(0, 8);
        return {
          ok: false,
          code: "duplicate_prevented",
          message: `${label} was already saved at ${timeLabel}. Please wait a few seconds.`,
          guardNote: `${DUPLICATE_PREVENTED_AUDIT_PREFIX} Repeated ${actionType} within ${duplicateWindowMs / 1000}s.`,
        };
      }
    }
  }

  if (actionType !== expectedAction) {
    const label = expectedAction === "clock_in" ? "Clock In" : "Clock Out";
    return {
      ok: false,
      code: "duplicate_prevented",
      message: `Use ${label} for your current session.`,
      guardNote: `${DUPLICATE_PREVENTED_AUDIT_PREFIX} Wrong button (${actionType} blocked; expected ${expectedAction}).`,
    };
  }

  return { ok: true, session, expectedAction };
}

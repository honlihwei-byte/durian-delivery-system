import {
  analyzeDayIssuesWithShift,
  type DayIssueStats,
} from "@/lib/attendance-report";
import {
  attendanceForTotals,
  sortByEventTime,
  staffHasPunchRows,
  type AttendanceRecord,
} from "@/lib/attendance";
import { matchStaffDayWithShopSchedule } from "@/lib/shop-schedule-resolve";
import { pickPrimaryScheduleForDay } from "@/lib/shifts/schedule-attendance-match";
import type { StaffScheduleRow } from "@/lib/shifts/staff-schedules-db";
import {
  buildHealthReasons,
  computeStaffReliabilityMvp,
  gpsIssueCountFromIssues,
  staffNeedsReviewToday,
  type HealthReason,
  type ShopHealthCounts,
} from "@/lib/operations-dashboard";
import type { ShopHealthRow } from "@/lib/operations-intelligence";
import { displayTaskStatus } from "@/lib/retail-tasks/task-status";
import type { TaskStatus } from "@/lib/retail-tasks/types";

/** Documented weights — keep in sync with operations-dashboard.ts */
export const SCORE_WEIGHTS = {
  shop: {
    late: 5,
    missing_clock_out: 8,
    gps_issues: 5,
    review_required: 5,
    overdue_tasks: 5,
    task_exceptions: 3,
  },
  staff: {
    late_day: 5,
    missing_clock_out_day: 8,
    gps_issue: 5,
    rejected_task_proof: 5,
    overdue_task: 3,
    task_exception: 3,
    photo_proof_punch: 4,
    review_required: 3,
    verified_task: 2,
    perfect_attendance_day: 1,
  },
} as const;

export type ScoreDelta = {
  key: string;
  points: number;
  count: number;
};

export type ScoreIncident = {
  at: string;
  date_ymd: string;
  type: string;
  label_key: string;
  detail?: string;
  shop_name?: string;
};

export type StaffContributingFactors = {
  late_punches: number;
  missing_punches: number;
  gps_issues: number;
  overdue_tasks: number;
  rejected_tasks: number;
  missing_photo_proof: number;
  review_required: number;
  task_exceptions: number;
  verified_tasks: number;
  perfect_attendance_days: number;
};

export type StaffScoreDrillDown = {
  staff_id: string;
  staff_name: string;
  shop_label: string;
  period_days: number;
  reliability_score: number;
  attendance_score: number;
  task_completion_score: number;
  gps_compliance_score: number;
  photo_compliance_score: number;
  contributing_factors: StaffContributingFactors;
  score_deltas: ScoreDelta[];
  incidents: ScoreIncident[];
  formula: {
    reliability: string;
    attendance: string;
    task_completion: string;
    gps_compliance: string;
    photo_compliance: string;
  };
};

export type ShopStaffHighlight = {
  staff_id: string;
  staff_name: string;
  score: number;
  note_key: string;
  delta?: number;
};

export type ShopScoreDrillDown = {
  shop_id: string;
  shop_name: string;
  date: string;
  health_score: number;
  attendance_score: number;
  task_score: number;
  gps_score: number;
  compliance_score: number;
  counts: ShopHealthCounts;
  reasons: HealthReason[];
  score_deltas: ScoreDelta[];
  best_performer: ShopStaffHighlight | null;
  most_improved: ShopStaffHighlight | null;
  needs_attention: ShopStaffHighlight[];
  incident_summary: Array<{ type: string; count: number; label_key: string }>;
  incidents: ScoreIncident[];
  formula: {
    health: string;
    attendance: string;
    task: string;
    gps: string;
    compliance: string;
  };
};

type StaffDayRow = {
  dayYmd: string;
  late_minutes: number;
  issues: DayIssueStats;
  history: AttendanceRecord[];
};

type StaffTaskRow = {
  id: string;
  shop_id: string;
  status: TaskStatus;
  due_date: string;
  due_time: string | null;
  title: string;
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildStaffDayRows(
  staffId: string,
  punches: AttendanceRecord[],
  schedulesByStaffDay: Map<string, Map<string, StaffScheduleRow[]>>,
): StaffDayRow[] {
  const byDay = new Map<string, AttendanceRecord[]>();
  for (const p of punches) {
    if (p.staff_id !== staffId) continue;
    const day = p.event_date?.slice(0, 10);
    if (!day) continue;
    const arr = byDay.get(day) ?? [];
    arr.push(p);
    byDay.set(day, arr);
  }

  const rows: StaffDayRow[] = [];
  for (const [dayYmd, dayPunches] of byDay) {
    const dayRows = sortByEventTime(dayPunches);
    if (!staffHasPunchRows(dayRows)) continue;

    const daySchedules = (schedulesByStaffDay.get(staffId)?.get(dayYmd) ?? []).filter(
      (r) => r.status === "active",
    );
    const explicit = pickPrimaryScheduleForDay({
      schedules: daySchedules,
      dayRows,
      shopIdFilter: null,
    });
    const matched = matchStaffDayWithShopSchedule({
      ymd: dayYmd,
      shop: null,
      explicitRow: explicit,
      explicitRows: daySchedules,
      allSchedulesForDay: daySchedules,
      history: dayRows,
      shopIdFilter: null,
    });
    rows.push({
      dayYmd,
      late_minutes: matched.late_minutes ?? 0,
      issues: analyzeDayIssuesWithShift(dayRows, matched.status),
      history: dayRows,
    });
  }
  return rows.sort((a, b) => b.dayYmd.localeCompare(a.dayYmd));
}

function staffTaskCounts(tasks: StaffTaskRow[]) {
  let overdue = 0;
  let exceptions = 0;
  let verified = 0;
  for (const t of tasks) {
    const display = displayTaskStatus(t.status, t.due_date, t.due_time);
    if (display === "overdue") overdue += 1;
    if (t.status === "exception_reported") exceptions += 1;
    if (t.status === "verified") verified += 1;
  }
  return { overdue, exceptions, verified };
}

function shopSubScores(counts: ShopHealthCounts) {
  const w = SCORE_WEIGHTS.shop;
  return {
    attendance_score: clampScore(
      100 - counts.late * w.late - counts.missing_clock_out * w.missing_clock_out,
    ),
    task_score: clampScore(
      100 - counts.overdue_tasks * w.overdue_tasks - counts.task_exceptions * w.task_exceptions,
    ),
    gps_score: clampScore(100 - counts.gps_issues * w.gps_issues),
    compliance_score: clampScore(100 - counts.review_required * w.review_required),
  };
}

export function buildShopScoreDeltas(counts: ShopHealthCounts): ScoreDelta[] {
  const w = SCORE_WEIGHTS.shop;
  const deltas: ScoreDelta[] = [];
  if (counts.late > 0) deltas.push({ key: "late_punch", points: -counts.late * w.late, count: counts.late });
  if (counts.missing_clock_out > 0) {
    deltas.push({
      key: "missing_clock_out",
      points: -counts.missing_clock_out * w.missing_clock_out,
      count: counts.missing_clock_out,
    });
  }
  if (counts.gps_issues > 0) {
    deltas.push({ key: "gps_issue", points: -counts.gps_issues * w.gps_issues, count: counts.gps_issues });
  }
  if (counts.review_required > 0) {
    deltas.push({
      key: "review_required",
      points: -counts.review_required * w.review_required,
      count: counts.review_required,
    });
  }
  if (counts.overdue_tasks > 0) {
    deltas.push({
      key: "overdue_task",
      points: -counts.overdue_tasks * w.overdue_tasks,
      count: counts.overdue_tasks,
    });
  }
  if (counts.task_exceptions > 0) {
    deltas.push({
      key: "task_exception",
      points: -counts.task_exceptions * w.task_exceptions,
      count: counts.task_exceptions,
    });
  }
  return deltas;
}

export function buildStaffScoreDeltas(factors: StaffContributingFactors): ScoreDelta[] {
  const w = SCORE_WEIGHTS.staff;
  const deltas: ScoreDelta[] = [];
  if (factors.late_punches > 0) {
    deltas.push({ key: "late_punch", points: -factors.late_punches * w.late_day, count: factors.late_punches });
  }
  if (factors.missing_punches > 0) {
    deltas.push({
      key: "missing_punch",
      points: -factors.missing_punches * w.missing_clock_out_day,
      count: factors.missing_punches,
    });
  }
  if (factors.gps_issues > 0) {
    deltas.push({ key: "gps_issue", points: -factors.gps_issues * w.gps_issue, count: factors.gps_issues });
  }
  if (factors.review_required > 0) {
    deltas.push({
      key: "review_required",
      points: -factors.review_required * w.review_required,
      count: factors.review_required,
    });
  }
  if (factors.overdue_tasks > 0) {
    deltas.push({
      key: "overdue_task",
      points: -factors.overdue_tasks * w.overdue_task,
      count: factors.overdue_tasks,
    });
  }
  if (factors.rejected_tasks > 0) {
    deltas.push({
      key: "rejected_task",
      points: -factors.rejected_tasks * w.rejected_task_proof,
      count: factors.rejected_tasks,
    });
  }
  if (factors.task_exceptions > 0) {
    deltas.push({
      key: "task_exception",
      points: -factors.task_exceptions * w.task_exception,
      count: factors.task_exceptions,
    });
  }
  if (factors.missing_photo_proof > 0) {
    deltas.push({
      key: "missing_photo_proof",
      points: -factors.missing_photo_proof * w.photo_proof_punch,
      count: factors.missing_photo_proof,
    });
  }
  if (factors.verified_tasks > 0) {
    deltas.push({
      key: "verified_task",
      points: factors.verified_tasks * w.verified_task,
      count: factors.verified_tasks,
    });
  }
  if (factors.perfect_attendance_days > 0) {
    deltas.push({
      key: "perfect_attendance_day",
      points: factors.perfect_attendance_days * w.perfect_attendance_day,
      count: factors.perfect_attendance_days,
    });
  }
  return deltas;
}

function staffIncidentsFromRows(
  dayRows: StaffDayRow[],
  shopNameById: Map<string, string>,
  tasks: StaffTaskRow[],
): ScoreIncident[] {
  const incidents: ScoreIncident[] = [];

  for (const row of dayRows) {
    const shopId = attendanceForTotals(row.history)[0]?.shop_id;
    const shop_name = shopId ? shopNameById.get(shopId) : undefined;
    const lastPunch = row.history[row.history.length - 1];
    const at = lastPunch?.event_time ?? `${row.dayYmd}T12:00:00+08:00`;

    if (row.late_minutes > 0) {
      incidents.push({
        at,
        date_ymd: row.dayYmd,
        type: "late",
        label_key: "drilldown.incident.late",
        detail: `${row.late_minutes}m`,
        shop_name,
      });
    }
    if (row.issues.missing_clock_out || row.issues.badges.includes("missing_clock_in")) {
      incidents.push({
        at,
        date_ymd: row.dayYmd,
        type: "missing_punch",
        label_key: "drilldown.incident.missing_punch",
        shop_name,
      });
    }
    if (gpsIssueCountFromIssues(row.issues) > 0) {
      incidents.push({
        at,
        date_ymd: row.dayYmd,
        type: "gps",
        label_key: "drilldown.incident.gps",
        shop_name,
      });
    }
    if (row.issues.photo_proof_count > 0) {
      incidents.push({
        at,
        date_ymd: row.dayYmd,
        type: "photo_proof",
        label_key: "drilldown.incident.photo_proof",
        shop_name,
      });
    }
    if (staffNeedsReviewToday(row.issues, row.history)) {
      incidents.push({
        at,
        date_ymd: row.dayYmd,
        type: "review",
        label_key: "drilldown.incident.review",
        shop_name,
      });
    }
  }

  for (const task of tasks) {
    const display = displayTaskStatus(task.status, task.due_date, task.due_time);
    if (display === "overdue") {
      incidents.push({
        at: `${task.due_date}T23:59:00+08:00`,
        date_ymd: task.due_date,
        type: "overdue_task",
        label_key: "drilldown.incident.overdue_task",
        detail: task.title,
        shop_name: shopNameById.get(task.shop_id),
      });
    }
    if (task.status === "exception_reported") {
      incidents.push({
        at: `${task.due_date}T12:00:00+08:00`,
        date_ymd: task.due_date,
        type: "task_exception",
        label_key: "drilldown.incident.task_exception",
        detail: task.title,
        shop_name: shopNameById.get(task.shop_id),
      });
    }
  }

  return incidents
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 20);
}

export function computeStaffScoreDrillDown(params: {
  staff: { id: string; staff_name: string };
  shop_label: string;
  period_days: number;
  punches: AttendanceRecord[];
  schedulesByStaffDay: Map<string, Map<string, StaffScheduleRow[]>>;
  rejected_task_proofs: number;
  tasks: StaffTaskRow[];
  shopNameById: Map<string, string>;
}): StaffScoreDrillDown {
  const { staff, shop_label, period_days, punches, schedulesByStaffDay, rejected_task_proofs, tasks, shopNameById } =
    params;
  const dayRows = buildStaffDayRows(staff.id, punches, schedulesByStaffDay);
  const taskCounts = staffTaskCounts(tasks);

  let late_punches = 0;
  let missing_punches = 0;
  let gps_issues = 0;
  let review_required = 0;
  let missing_photo_proof = 0;
  let perfect_attendance_days = 0;

  for (const row of dayRows) {
    if (row.late_minutes > 0) late_punches += 1;
    if (row.issues.missing_clock_out || row.issues.badges.includes("missing_clock_in")) {
      missing_punches += 1;
    }
    gps_issues += gpsIssueCountFromIssues(row.issues);
    if (staffNeedsReviewToday(row.issues, row.history)) review_required += 1;
    missing_photo_proof += row.issues.photo_proof_count;
    const hasIssue =
      row.late_minutes > 0 ||
      row.issues.missing_clock_out ||
      gpsIssueCountFromIssues(row.issues) > 0 ||
      staffNeedsReviewToday(row.issues, row.history);
    if (!hasIssue && row.history.length > 0) perfect_attendance_days += 1;
  }

  const factors: StaffContributingFactors = {
    late_punches,
    missing_punches,
    gps_issues,
    overdue_tasks: taskCounts.overdue,
    rejected_tasks: rejected_task_proofs,
    missing_photo_proof,
    review_required,
    task_exceptions: taskCounts.exceptions,
    verified_tasks: taskCounts.verified,
    perfect_attendance_days,
  };

  const w = SCORE_WEIGHTS.staff;
  const reliability_score = computeStaffReliabilityMvp({
    late: late_punches,
    missing_clock_out: missing_punches,
    gps_issues,
    rejected_task_proofs,
  });
  const attendance_score = clampScore(
    100 - late_punches * w.late_day - missing_punches * w.missing_clock_out_day,
  );
  const task_completion_score = clampScore(
    100 -
      taskCounts.overdue * w.overdue_task -
      rejected_task_proofs * w.rejected_task_proof -
      taskCounts.exceptions * w.task_exception +
      taskCounts.verified * w.verified_task,
  );
  const gps_compliance_score = clampScore(
    100 - gps_issues * w.gps_issue - review_required * w.review_required,
  );
  const photo_compliance_score = clampScore(100 - missing_photo_proof * w.photo_proof_punch);

  return {
    staff_id: staff.id,
    staff_name: staff.staff_name,
    shop_label,
    period_days,
    reliability_score,
    attendance_score,
    task_completion_score,
    gps_compliance_score,
    photo_compliance_score,
    contributing_factors: factors,
    score_deltas: buildStaffScoreDeltas(factors),
    incidents: staffIncidentsFromRows(dayRows, shopNameById, tasks),
    formula: {
      reliability:
        "100 − (late days×5) − (missing punch days×8) − (GPS issues×5) − (rejected task proofs×5)",
      attendance: "100 − (late days×5) − (missing punch days×8)",
      task_completion:
        "100 − (overdue tasks×3) − (rejected proofs×5) − (exceptions×3) + (verified tasks×2)",
      gps_compliance: "100 − (GPS issues×5) − (review flags×3)",
      photo_compliance: "100 − (photo-proof punches×4)",
    },
  };
}

function shopIncidentsFromDay(
  shopId: string,
  shopName: string,
  dayYmd: string,
  staff: Array<{ id: string; staff_name: string }>,
  punches: AttendanceRecord[],
  schedulesByStaffDay: Map<string, Map<string, StaffScheduleRow[]>>,
): ScoreIncident[] {
  const incidents: ScoreIncident[] = [];
  const staffById = new Map(staff.map((s) => [s.id, s]));

  for (const s of staff) {
    const dayPunches = punches.filter(
      (p) => p.staff_id === s.id && p.event_date?.slice(0, 10) === dayYmd && p.shop_id === shopId,
    );
    if (dayPunches.length === 0) continue;
    const rows = buildStaffDayRows(s.id, dayPunches, schedulesByStaffDay);
    const row = rows[0];
    if (!row) continue;
    const at = row.history[row.history.length - 1]?.event_time ?? `${dayYmd}T12:00:00+08:00`;
    const name = staffById.get(s.id)?.staff_name ?? s.id;

    if (row.late_minutes > 0) {
      incidents.push({
        at,
        date_ymd: dayYmd,
        type: "late",
        label_key: "drilldown.incident.late",
        detail: name,
        shop_name: shopName,
      });
    }
    if (row.issues.missing_clock_out) {
      incidents.push({
        at,
        date_ymd: dayYmd,
        type: "missing_punch",
        label_key: "drilldown.incident.missing_punch",
        detail: name,
        shop_name: shopName,
      });
    }
    if (gpsIssueCountFromIssues(row.issues) > 0) {
      incidents.push({
        at,
        date_ymd: dayYmd,
        type: "gps",
        label_key: "drilldown.incident.gps",
        detail: name,
        shop_name: shopName,
      });
    }
    if (staffNeedsReviewToday(row.issues, row.history)) {
      incidents.push({
        at,
        date_ymd: dayYmd,
        type: "review",
        label_key: "drilldown.incident.review",
        detail: name,
        shop_name: shopName,
      });
    }
  }
  return incidents.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20);
}

export function computeShopScoreDrillDown(params: {
  shopRow: ShopHealthRow;
  date: string;
  staff: Array<{ id: string; staff_name: string }>;
  punches: AttendanceRecord[];
  schedulesByStaffDay: Map<string, Map<string, StaffScheduleRow[]>>;
  reliabilityByStaff: Map<string, number>;
  reliabilityTrendByStaff: Map<string, { current: number; previous: number }>;
  todayAttentionStaffIds: Set<string>;
}): ShopScoreDrillDown {
  const {
    shopRow,
    date,
    staff,
    punches,
    schedulesByStaffDay,
    reliabilityByStaff,
    reliabilityTrendByStaff,
    todayAttentionStaffIds,
  } = params;

  const counts = shopRow.counts;
  const subs = shopSubScores(counts);
  const shopStaffIds = new Set<string>();
  for (const p of punches) {
    if (p.shop_id === shopRow.shop_id && p.event_date?.slice(0, 10) === date) {
      shopStaffIds.add(p.staff_id);
    }
  }

  const shopStaffReliability = staff
    .filter((s) => shopStaffIds.has(s.id) && reliabilityByStaff.has(s.id))
    .map((s) => ({
      staff_id: s.id,
      staff_name: s.staff_name,
      score: reliabilityByStaff.get(s.id)!,
    }));

  const best_performer =
    shopStaffReliability.length > 0
      ? [...shopStaffReliability]
          .sort((a, b) => b.score - a.score)
          .slice(0, 1)
          .map((s) => ({
            staff_id: s.staff_id,
            staff_name: s.staff_name,
            score: s.score,
            note_key: "drilldown.shop.best_performer",
          }))[0] ?? null
      : null;

  let most_improved: ShopStaffHighlight | null = null;
  let bestDelta = -Infinity;
  for (const s of shopStaffReliability) {
    const trend = reliabilityTrendByStaff.get(s.staff_id);
    if (!trend) continue;
    const delta = trend.current - trend.previous;
    if (delta > bestDelta) {
      bestDelta = delta;
      most_improved = {
        staff_id: s.staff_id,
        staff_name: s.staff_name,
        score: trend.current,
        delta: Math.round(delta * 10) / 10,
        note_key: "drilldown.shop.most_improved",
      };
    }
  }

  const needs_attention: ShopStaffHighlight[] = staff
    .filter((s) => shopStaffIds.has(s.id))
    .map((s) => ({
      staff_id: s.id,
      staff_name: s.staff_name,
      score: reliabilityByStaff.get(s.id) ?? 0,
      note_key: todayAttentionStaffIds.has(s.id)
        ? "drilldown.shop.flagged_today"
        : "drilldown.shop.low_reliability",
    }))
    .filter((s) => s.score < 75 || todayAttentionStaffIds.has(s.staff_id))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  const incident_summary = buildHealthReasons(counts).map((r) => ({
    type: r.key,
    count: r.count,
    label_key: `drilldown.factor.${r.key}`,
  }));

  return {
    shop_id: shopRow.shop_id,
    shop_name: shopRow.shop_name,
    date,
    health_score: shopRow.health_score,
    ...subs,
    counts,
    reasons: shopRow.reasons,
    score_deltas: buildShopScoreDeltas(counts),
    best_performer,
    most_improved: most_improved && (most_improved.delta ?? 0) > 0 ? most_improved : null,
    needs_attention,
    incident_summary,
    incidents: shopIncidentsFromDay(
      shopRow.shop_id,
      shopRow.shop_name,
      date,
      staff,
      punches,
      schedulesByStaffDay,
    ),
    formula: {
      health:
        "100 − (late×5) − (missing clock-out×8) − (GPS issues×5) − (review×5) − (overdue tasks×5) − (task exceptions×3)",
      attendance: "100 − (late×5) − (missing clock-out×8)",
      task: "100 − (overdue tasks×5) − (task exceptions×3)",
      gps: "100 − (GPS issues×5)",
      compliance: "100 − (review required×5)",
    },
  };
}

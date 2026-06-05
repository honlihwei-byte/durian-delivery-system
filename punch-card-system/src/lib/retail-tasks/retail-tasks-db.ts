import { logTaskActivity } from "@/lib/retail-tasks/task-activity";
import { displayTaskStatus } from "@/lib/retail-tasks/task-status";
import type {
  RetailTaskActivityRow,
  RetailTaskFeedbackRow,
  RetailTaskListItem,
  RetailTaskRow,
  RetailTaskSubmissionRow,
  RetailTaskVerificationRow,
  TaskCategory,
  TaskPriority,
  TaskRepeatType,
  TaskStaffRole,
  TaskStatus,
} from "@/lib/retail-tasks/types";
import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

const TASK_SELECT =
  "id, company_id, shop_id, assigned_staff_id, verifier_staff_id, title, description, category, priority, status, due_date, due_time, repeat_type, photo_required, gps_required, feedback_allowed, created_by, started_at, started_by, created_at, updated_at";

function normalizeTask(row: Record<string, unknown>): RetailTaskRow {
  return {
    id: String(row.id),
    company_id: String(row.company_id),
    shop_id: String(row.shop_id),
    assigned_staff_id: row.assigned_staff_id != null ? String(row.assigned_staff_id) : null,
    verifier_staff_id: row.verifier_staff_id != null ? String(row.verifier_staff_id) : null,
    title: String(row.title ?? ""),
    description: row.description != null ? String(row.description) : null,
    category: String(row.category) as TaskCategory,
    priority: String(row.priority ?? "normal") as TaskPriority,
    status: String(row.status ?? "pending") as TaskStatus,
    due_date: String(row.due_date),
    due_time: row.due_time != null ? String(row.due_time).slice(0, 5) : null,
    repeat_type: String(row.repeat_type ?? "one_time") as TaskRepeatType,
    photo_required: row.photo_required === true,
    gps_required: row.gps_required === true,
    feedback_allowed: row.feedback_allowed !== false,
    created_by: row.created_by != null ? String(row.created_by) : null,
    started_at: row.started_at != null ? String(row.started_at) : null,
    started_by: row.started_by != null ? String(row.started_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function getStaffTaskRole(
  supabase: Supabase,
  companyId: string,
  staffId: string,
): Promise<TaskStaffRole> {
  const { data } = await supabase
    .from("staff_task_roles")
    .select("role")
    .eq("company_id", companyId)
    .eq("staff_id", staffId)
    .maybeSingle();
  const role = String(data?.role ?? "staff");
  if (role === "manager" || role === "supervisor") return role;
  return "staff";
}

export async function getStaffShopIds(supabase: Supabase, staffId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("staff_shop_assignments")
    .select("shop_id")
    .eq("staff_id", staffId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => String(r.shop_id));
}

export async function listRetailTasks(
  supabase: Supabase,
  params: {
    companyId: string;
    shopId?: string;
    staffId?: string;
    from?: string;
    to?: string;
    status?: string;
  },
): Promise<RetailTaskListItem[]> {
  let q = supabase
    .from("retail_tasks")
    .select(TASK_SELECT)
    .eq("company_id", params.companyId)
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true, nullsFirst: false });

  if (params.shopId) q = q.eq("shop_id", params.shopId);
  if (params.from) q = q.gte("due_date", params.from);
  if (params.to) q = q.lte("due_date", params.to);
  if (params.status) q = q.eq("status", params.status);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  let rows = (data ?? []).map((r) => normalizeTask(r as Record<string, unknown>));

  if (params.staffId) {
    const sid = params.staffId;
    rows = rows.filter(
      (t) =>
        t.assigned_staff_id === sid ||
        t.verifier_staff_id === sid ||
        !t.assigned_staff_id,
    );
  }

  return enrichTaskList(supabase, rows);
}

async function enrichTaskList(
  supabase: Supabase,
  rows: RetailTaskRow[],
): Promise<RetailTaskListItem[]> {
  if (rows.length === 0) return [];

  const shopIds = [...new Set(rows.map((r) => r.shop_id))];
  const staffIds = [
    ...new Set(
      rows.flatMap((r) => [r.assigned_staff_id, r.verifier_staff_id].filter(Boolean) as string[]),
    ),
  ];

  const [shopsRes, staffRes] = await Promise.all([
    supabase.from("shops").select("id, name").in("id", shopIds),
    staffIds.length > 0
      ? supabase.from("staff").select("id, staff_name").in("id", staffIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const shopNames = new Map((shopsRes.data ?? []).map((s) => [String(s.id), String(s.name)]));
  const staffNames = new Map((staffRes.data ?? []).map((s) => [String(s.id), String(s.staff_name)]));

  return rows.map((r) => ({
    ...r,
    shop_name: shopNames.get(r.shop_id) ?? "Shop",
    assigned_staff_name: r.assigned_staff_id
      ? (staffNames.get(r.assigned_staff_id) ?? null)
      : null,
    verifier_staff_name: r.verifier_staff_id
      ? (staffNames.get(r.verifier_staff_id) ?? null)
      : null,
    display_status: displayTaskStatus(r.status, r.due_date, r.due_time),
  }));
}

export async function getRetailTaskById(
  supabase: Supabase,
  taskId: string,
): Promise<RetailTaskRow | null> {
  const { data, error } = await supabase
    .from("retail_tasks")
    .select(TASK_SELECT)
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return normalizeTask(data as Record<string, unknown>);
}

export async function createRetailTask(
  supabase: Supabase,
  row: Omit<RetailTaskRow, "id" | "created_at" | "updated_at" | "started_at" | "started_by"> & {
    started_at?: null;
    started_by?: null;
  },
  actor: { name: string; role: string },
): Promise<RetailTaskRow> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("retail_tasks")
    .insert({
      ...row,
      status: row.status ?? "pending",
      updated_at: now,
    })
    .select(TASK_SELECT)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create task");

  const task = normalizeTask(data as Record<string, unknown>);
  await logTaskActivity(supabase, {
    task_id: task.id,
    actor_name: actor.name,
    actor_role: actor.role,
    action_type: "created",
    new_status: task.status,
    note: task.title,
  });
  return task;
}

export async function updateRetailTask(
  supabase: Supabase,
  taskId: string,
  patch: Partial<
    Pick<
      RetailTaskRow,
      | "title"
      | "description"
      | "category"
      | "priority"
      | "due_date"
      | "due_time"
      | "repeat_type"
      | "photo_required"
      | "gps_required"
      | "feedback_allowed"
      | "assigned_staff_id"
      | "verifier_staff_id"
      | "shop_id"
    >
  >,
  actor: { name: string; role: string },
): Promise<RetailTaskRow> {
  const existing = await getRetailTaskById(supabase, taskId);
  if (!existing) throw new Error("Task not found");

  const { data, error } = await supabase
    .from("retail_tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select(TASK_SELECT)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not update task");

  const task = normalizeTask(data as Record<string, unknown>);
  await logTaskActivity(supabase, {
    task_id: taskId,
    actor_name: actor.name,
    actor_role: actor.role,
    action_type: "updated",
    old_status: existing.status,
    new_status: task.status,
  });
  return task;
}

export async function deleteRetailTask(
  supabase: Supabase,
  taskId: string,
  actor: { name: string; role: string },
): Promise<void> {
  const existing = await getRetailTaskById(supabase, taskId);
  if (!existing) throw new Error("Task not found");

  const { error } = await supabase.from("retail_tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);

  await logTaskActivity(supabase, {
    task_id: taskId,
    actor_name: actor.name,
    actor_role: actor.role,
    action_type: "deleted",
    old_status: existing.status,
    note: existing.title,
  });
}

export async function setTaskStatus(
  supabase: Supabase,
  taskId: string,
  status: TaskStatus,
  actor: { id?: string | null; name: string; role: string },
  action: "started" | "submitted" | "verified" | "rejected" | "exception_reported" | "status_changed",
  note?: string,
  extra?: Partial<Pick<RetailTaskRow, "started_at" | "started_by">>,
): Promise<RetailTaskRow> {
  const existing = await getRetailTaskById(supabase, taskId);
  if (!existing) throw new Error("Task not found");

  const { data, error } = await supabase
    .from("retail_tasks")
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...extra,
    })
    .eq("id", taskId)
    .select(TASK_SELECT)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not update status");

  const task = normalizeTask(data as Record<string, unknown>);
  await logTaskActivity(supabase, {
    task_id: taskId,
    actor_id: actor.id ?? null,
    actor_name: actor.name,
    actor_role: actor.role,
    action_type: action,
    old_status: existing.status,
    new_status: status,
    note,
  });
  return task;
}

export async function createTaskSubmission(
  supabase: Supabase,
  params: {
    task_id: string;
    submitted_by: string;
    photo_url?: string | null;
    comment?: string | null;
    gps_lat?: number | null;
    gps_lng?: number | null;
    gps_distance_meters?: number | null;
    gps_status?: string | null;
  },
): Promise<RetailTaskSubmissionRow> {
  await supabase
    .from("retail_task_submissions")
    .update({ status: "superseded" })
    .eq("task_id", params.task_id)
    .eq("status", "submitted");

  const { data, error } = await supabase
    .from("retail_task_submissions")
    .insert({
      task_id: params.task_id,
      submitted_by: params.submitted_by,
      photo_url: params.photo_url ?? null,
      comment: params.comment ?? null,
      gps_lat: params.gps_lat ?? null,
      gps_lng: params.gps_lng ?? null,
      gps_distance_meters: params.gps_distance_meters ?? null,
      gps_status: params.gps_status ?? null,
      status: "submitted",
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not save submission");
  return data as RetailTaskSubmissionRow;
}

export async function createTaskFeedback(
  supabase: Supabase,
  params: {
    task_id: string;
    submitted_by: string;
    reason_type: string;
    reason_text: string;
    photo_url?: string | null;
    shop_id?: string | null;
    actor_role?: string | null;
  },
): Promise<RetailTaskFeedbackRow> {
  const { data, error } = await supabase
    .from("retail_task_feedback")
    .insert(params)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not save feedback");
  return data as RetailTaskFeedbackRow;
}

export async function createTaskVerification(
  supabase: Supabase,
  params: {
    task_id: string;
    submission_id: string | null;
    verifier_id: string;
    decision: "approved" | "rejected";
    rejection_reason?: string | null;
  },
): Promise<RetailTaskVerificationRow> {
  const { data, error } = await supabase
    .from("retail_task_verifications")
    .insert(params)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not save verification");
  return data as RetailTaskVerificationRow;
}

export async function getTaskDetailBundle(
  supabase: Supabase,
  taskId: string,
): Promise<{
  task: RetailTaskListItem;
  submissions: RetailTaskSubmissionRow[];
  feedback: RetailTaskFeedbackRow[];
  activity: RetailTaskActivityRow[];
  verifications: RetailTaskVerificationRow[];
} | null> {
  const task = await getRetailTaskById(supabase, taskId);
  if (!task) return null;

  const [enriched, subs, fb, act, ver] = await Promise.all([
    enrichTaskList(supabase, [task]),
    supabase
      .from("retail_task_submissions")
      .select("*")
      .eq("task_id", taskId)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("retail_task_feedback")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false }),
    supabase
      .from("retail_task_activity_logs")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false }),
    supabase
      .from("retail_task_verifications")
      .select("*")
      .eq("task_id", taskId)
      .order("verified_at", { ascending: false }),
  ]);

  return {
    task: enriched[0]!,
    submissions: (subs.data ?? []) as RetailTaskSubmissionRow[],
    feedback: (fb.data ?? []) as RetailTaskFeedbackRow[],
    activity: (act.data ?? []) as RetailTaskActivityRow[],
    verifications: (ver.data ?? []) as RetailTaskVerificationRow[],
  };
}

export async function getTaskDashboardStats(
  supabase: Supabase,
  companyId: string,
  date: string,
): Promise<{
  today_total: number;
  pending: number;
  submitted: number;
  verified: number;
  overdue: number;
  exception_reported: number;
  pending_verification: number;
  shops_unfinished: number;
}> {
  const { data, error } = await supabase
    .from("retail_tasks")
    .select("id, shop_id, status, due_date, due_time")
    .eq("company_id", companyId)
    .eq("due_date", date);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    id: string;
    shop_id: string;
    status: TaskStatus;
    due_date: string;
    due_time: string | null;
  }>;

  let pending = 0;
  let submitted = 0;
  let verified = 0;
  let overdue = 0;
  let exception_reported = 0;
  const unfinishedShops = new Set<string>();

  for (const r of rows) {
    const display = displayTaskStatus(r.status, r.due_date, r.due_time);
    if (display === "overdue") overdue++;
    if (r.status === "pending" || r.status === "in_progress" || display === "overdue") {
      pending++;
      unfinishedShops.add(r.shop_id);
    }
    if (r.status === "submitted") submitted++;
    if (r.status === "verified") verified++;
    if (r.status === "exception_reported") exception_reported++;
  }

  return {
    today_total: rows.length,
    pending,
    submitted,
    verified,
    overdue,
    exception_reported,
    pending_verification: submitted,
    shops_unfinished: unfinishedShops.size,
  };
}

export async function getLatestSubmission(
  supabase: Supabase,
  taskId: string,
): Promise<RetailTaskSubmissionRow | null> {
  const { data } = await supabase
    .from("retail_task_submissions")
    .select("*")
    .eq("task_id", taskId)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as RetailTaskSubmissionRow | null) ?? null;
}

import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

export type EmployeeNotificationType =
  | "task_assigned"
  | "task_due_soon"
  | "task_rejected"
  | "schedule_changed"
  | "missing_clock_out";

export async function createEmployeeNotification(
  supabase: Supabase,
  params: {
    staff_id: string;
    company_id: string;
    type: EmployeeNotificationType;
    title: string;
    body?: string;
    link_path?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<string> {
  const { data, error } = await supabase
    .from("employee_notifications")
    .insert({
      staff_id: params.staff_id,
      company_id: params.company_id,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      link_path: params.link_path ?? null,
      metadata: params.metadata ?? {},
      delivery_channel: "in_app",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const notificationId = String(data.id);

  await supabase.from("employee_notification_outbox").insert({
    notification_id: notificationId,
    staff_id: params.staff_id,
    channel: "whatsapp",
    status: "skipped",
    payload: { reason: "mvp_in_app_only", type: params.type },
  });

  return notificationId;
}

export async function countUnreadNotifications(
  supabase: Supabase,
  staffId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("employee_notifications")
    .select("id", { count: "exact", head: true })
    .eq("staff_id", staffId)
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function listEmployeeNotifications(
  supabase: Supabase,
  staffId: string,
  limit = 50,
): Promise<
  Array<{
    id: string;
    type: string;
    title: string;
    body: string | null;
    link_path: string | null;
    read_at: string | null;
    created_at: string;
  }>
> {
  const { data, error } = await supabase
    .from("employee_notifications")
    .select("id, type, title, body, link_path, read_at, created_at")
    .eq("staff_id", staffId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    type: String(r.type),
    title: String(r.title),
    body: r.body != null ? String(r.body) : null,
    link_path: r.link_path != null ? String(r.link_path) : null,
    read_at: r.read_at != null ? String(r.read_at) : null,
    created_at: String(r.created_at),
  }));
}

export async function markNotificationRead(
  supabase: Supabase,
  staffId: string,
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .from("employee_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("staff_id", staffId);
  if (error) throw new Error(error.message);
}

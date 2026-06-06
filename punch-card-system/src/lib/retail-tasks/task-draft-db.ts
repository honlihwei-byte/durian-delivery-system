import { normalizePhotoRecords } from "@/lib/retail-tasks/task-proof-photos";
import type { TaskProofPhotoRecord } from "@/lib/retail-tasks/types";
import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

export type RetailTaskDraftRow = {
  id: string;
  task_id: string;
  staff_id: string;
  photo_urls: TaskProofPhotoRecord[];
  checklist_completed: Record<string, boolean> | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeDraft(row: Record<string, unknown>): RetailTaskDraftRow {
  return {
    id: String(row.id),
    task_id: String(row.task_id),
    staff_id: String(row.staff_id),
    photo_urls: normalizePhotoRecords(row.photo_urls),
    checklist_completed:
      row.checklist_completed != null && typeof row.checklist_completed === "object"
        ? (row.checklist_completed as Record<string, boolean>)
        : null,
    comment: row.comment != null ? String(row.comment) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function getTaskDraft(
  supabase: Supabase,
  taskId: string,
  staffId: string,
): Promise<RetailTaskDraftRow | null> {
  const { data, error } = await supabase
    .from("retail_task_drafts")
    .select("*")
    .eq("task_id", taskId)
    .eq("staff_id", staffId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return normalizeDraft(data as Record<string, unknown>);
}

export async function upsertTaskDraft(
  supabase: Supabase,
  params: {
    task_id: string;
    staff_id: string;
    photo_urls?: TaskProofPhotoRecord[];
    checklist_completed?: Record<string, boolean> | null;
    comment?: string | null;
  },
): Promise<RetailTaskDraftRow> {
  const now = new Date().toISOString();
  const existing = await getTaskDraft(supabase, params.task_id, params.staff_id);

  const payload = {
    task_id: params.task_id,
    staff_id: params.staff_id,
    photo_urls: params.photo_urls ?? existing?.photo_urls ?? [],
    checklist_completed:
      params.checklist_completed !== undefined
        ? params.checklist_completed
        : (existing?.checklist_completed ?? null),
    comment: params.comment !== undefined ? params.comment : (existing?.comment ?? null),
    updated_at: now,
  };

  if (existing) {
    const { data, error } = await supabase
      .from("retail_task_drafts")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Could not update draft");
    return normalizeDraft(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("retail_task_drafts")
    .insert({ ...payload, created_at: now })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create draft");
  return normalizeDraft(data as Record<string, unknown>);
}

export async function appendPhotoToTaskDraft(
  supabase: Supabase,
  params: {
    task_id: string;
    staff_id: string;
    photo: TaskProofPhotoRecord;
  },
): Promise<RetailTaskDraftRow> {
  const existing = await getTaskDraft(supabase, params.task_id, params.staff_id);
  const photos = [...(existing?.photo_urls ?? []), params.photo];
  return upsertTaskDraft(supabase, {
    task_id: params.task_id,
    staff_id: params.staff_id,
    photo_urls: photos,
    checklist_completed: existing?.checklist_completed ?? null,
    comment: existing?.comment ?? null,
  });
}

export async function deleteTaskDraft(
  supabase: Supabase,
  taskId: string,
  staffId: string,
): Promise<void> {
  const { error } = await supabase
    .from("retail_task_drafts")
    .delete()
    .eq("task_id", taskId)
    .eq("staff_id", staffId);
  if (error) throw new Error(error.message);
}

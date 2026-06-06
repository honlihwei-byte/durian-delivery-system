import type { TaskProofPhotoRecord } from "@/lib/retail-tasks/types";

export type TaskDraftPhoto = TaskProofPhotoRecord & { preview_url?: string | null };

export type TaskDraftPayload = {
  photo_urls?: TaskProofPhotoRecord[];
  checklist?: Record<string, boolean>;
  comment?: string;
};

export type SaveDraftResult =
  | { ok: true }
  | { ok: false; error: string };

async function readErr(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function loadTaskDraft(
  shopId: string,
  taskId: string,
  staffId: string,
): Promise<{
  checklist: Record<string, boolean>;
  comment: string;
  photos: TaskDraftPhoto[];
} | null> {
  const qs = new URLSearchParams({ staff_id: staffId });
  const res = await fetch(
    `/api/shops/${encodeURIComponent(shopId)}/retail-tasks/${encodeURIComponent(taskId)}/draft?${qs}`,
  );
  if (!res.ok) throw new Error(await readErr(res));
  const j = (await res.json()) as {
    draft?: {
      checklist_completed?: Record<string, boolean> | null;
      comment?: string | null;
      photo_urls?: TaskDraftPhoto[];
    } | null;
  };
  if (!j.draft) return null;
  return {
    checklist: j.draft.checklist_completed ?? {},
    comment: j.draft.comment ?? "",
    photos: j.draft.photo_urls ?? [],
  };
}

export async function saveTaskDraft(
  shopId: string,
  taskId: string,
  staffId: string,
  payload: TaskDraftPayload,
): Promise<SaveDraftResult> {
  const res = await fetch(
    `/api/shops/${encodeURIComponent(shopId)}/retail-tasks/${encodeURIComponent(taskId)}/draft`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_id: staffId, ...payload }),
    },
  );
  if (!res.ok) return { ok: false, error: await readErr(res) };
  return { ok: true };
}

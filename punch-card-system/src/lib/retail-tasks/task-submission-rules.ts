import {
  isChecklistComplete,
  parseChecklistCompletionFromBody,
} from "@/lib/retail-tasks/task-checklist";
import type { RetailTaskRow, TaskChecklistItem } from "@/lib/retail-tasks/types";

export const PHOTO_PRESET_OPTIONS = [0, 1, 3, 5] as const;

export function minRequiredTaskPhotos(task: Pick<RetailTaskRow, "min_photos" | "photo_required">): number {
  if (task.min_photos > 0) return task.min_photos;
  if (task.photo_required) return 1;
  return 0;
}

export function parsePhotoUrlsFromBody(body: Record<string, unknown>): string[] {
  if (Array.isArray(body.photo_urls)) {
    return body.photo_urls
      .map((u) => (typeof u === "string" ? u.trim() : ""))
      .filter(Boolean);
  }
  const single = body.photo_url != null ? String(body.photo_url).trim() : "";
  return single ? [single] : [];
}

export function validateTaskSubmission(
  task: Pick<RetailTaskRow, "min_photos" | "photo_required" | "checklist_items">,
  body: Record<string, unknown>,
): {
  ok: true;
  photo_urls: string[];
  checklist: Record<string, boolean> | null;
} | { ok: false; error: string } {
  const photo_urls = parsePhotoUrlsFromBody(body);
  const minPhotos = minRequiredTaskPhotos(task);
  const items = task.checklist_items ?? [];

  if (photo_urls.length < minPhotos) {
    return {
      ok: false,
      error:
        minPhotos > 1
          ? `At least ${minPhotos} photos are required for this task.`
          : "Photo proof is required.",
    };
  }

  let checklist: Record<string, boolean> | null = null;
  if (items.length > 0) {
    checklist = parseChecklistCompletionFromBody(items, body.checklist);
    if (!checklist) {
      return { ok: false, error: "Checklist completion is required." };
    }
    if (!isChecklistComplete(items, checklist)) {
      return { ok: false, error: "Complete all required checklist items before submitting." };
    }
  }

  return { ok: true, photo_urls, checklist };
}

export function checklistItemsForDisplay(items: TaskChecklistItem[]): TaskChecklistItem[] {
  return [...items].sort((a, b) => a.sort_order - b.sort_order);
}

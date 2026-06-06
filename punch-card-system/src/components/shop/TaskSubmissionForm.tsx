"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { TaskProofCamera } from "@/components/shop/TaskProofCamera";
import { getCachedGpsPositionForDisplay } from "@/lib/geolocation-client";
import { isChecklistComplete } from "@/lib/retail-tasks/task-checklist";
import { uploadTaskProofWithProgress } from "@/lib/retail-tasks/task-photo-upload-client";
import { minRequiredTaskPhotos } from "@/lib/retail-tasks/task-submission-rules";
import type { RetailTaskListItem } from "@/lib/retail-tasks/types";

type UploadedPhoto = {
  storagePath: string;
  previewUrl: string;
};

type Props = {
  task: RetailTaskListItem;
  shopId: string;
  staffId: string;
  staffName: string;
  companyName: string;
  shopName: string;
  comment: string;
  onCommentChange: (value: string) => void;
  busy: boolean;
  onSubmit: (payload: {
    photo_urls: string[];
    checklist?: Record<string, boolean>;
    comment?: string;
    staff_latitude?: number;
    staff_longitude?: number;
    gps_accuracy_meters?: number;
  }) => Promise<void>;
};

export function TaskSubmissionForm({
  task,
  shopId,
  staffId,
  staffName,
  companyName,
  shopName,
  comment,
  onCommentChange,
  busy,
  onSubmit,
}: Props) {
  const { t } = useI18n();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const checklistItems = useMemo(
    () => [...(task.checklist_items ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [task.checklist_items],
  );
  const minPhotos = minRequiredTaskPhotos(task);
  const needsPhotos = minPhotos > 0;
  const allowGallery = task.photo_capture_mode === "camera_or_gallery";

  const gpsLabel = useMemo(() => {
    const gps = getCachedGpsPositionForDisplay();
    if (gps?.latitude != null && gps.longitude != null) {
      return `GPS ${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}`;
    }
    return t("tasks.staff.gpsUnavailable");
  }, [t]);

  useEffect(() => {
    return () => {
      for (const p of photos) URL.revokeObjectURL(p.previewUrl);
    };
  }, [photos]);

  const uploadPhoto = useCallback(
    async (file: File): Promise<string> => {
      const form = new FormData();
      form.set("staff_id", staffId);
      form.set("task_id", task.id);
      form.set("file", file, "task-proof.jpg");
      const uploadUrl = `/api/shops/${encodeURIComponent(shopId)}/retail-tasks/photo-upload`;
      setUploadPercent(0);
      const result = await uploadTaskProofWithProgress(uploadUrl, form, (p) =>
        setUploadPercent(p.percent),
      );
      if (!result.ok) throw new Error(result.error);
      return result.photo_url;
    },
    [shopId, staffId, task.id],
  );

  const handleCaptured = useCallback(
    async (file: File, previewUrl: string) => {
      setUploading(true);
      setError(null);
      try {
        const path = await uploadPhoto(file);
        setPhotos((prev) => [...prev, { storagePath: path, previewUrl }]);
      } catch (e) {
        URL.revokeObjectURL(previewUrl);
        setError(e instanceof Error ? e.message : t("tasks.staff.uploadFailed"));
      } finally {
        setUploading(false);
        setUploadPercent(0);
      }
    },
    [t, uploadPhoto],
  );

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  };

  const checklistComplete = isChecklistComplete(checklistItems, checklist);
  const photosComplete = !needsPhotos || photos.length >= minPhotos;
  const canSubmit = checklistComplete && photosComplete && !uploading && !busy;

  async function handleSubmitClick() {
    if (!checklistComplete) {
      setError(t("tasks.staff.checklistIncomplete"));
      return;
    }
    if (!photosComplete) {
      setError(t("tasks.staff.notEnoughPhotos").replace("{count}", String(minPhotos)));
      return;
    }

    const gps = getCachedGpsPositionForDisplay();
    const checklistPayload =
      checklistItems.length > 0
        ? Object.fromEntries(checklistItems.map((item) => [item.id, checklist[item.id] === true]))
        : undefined;

    await onSubmit({
      photo_urls: photos.map((p) => p.storagePath),
      checklist: checklistPayload,
      comment: comment.trim() || undefined,
      staff_latitude: gps?.latitude,
      staff_longitude: gps?.longitude,
      gps_accuracy_meters: gps?.accuracyMeters,
    });
  }

  return (
    <div className="space-y-3">
      {checklistItems.length > 0 ? (
        <fieldset className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
          <legend className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            {t("tasks.staff.checklistTitle")}
          </legend>
          <p className="text-[10px] text-zinc-500">{t("tasks.staff.checklistRequired")}</p>
          {checklistItems.map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={checklist[item.id] === true}
                onChange={(e) =>
                  setChecklist((c) => ({ ...c, [item.id]: e.target.checked }))
                }
              />
              <span>
                {item.label}
                {!item.required ? (
                  <span className="ml-1 text-[10px] text-zinc-400">
                    ({t("tasks.staff.checklistOptional")})
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {needsPhotos ? (
        <div className="space-y-2">
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {t("tasks.staff.photosProgress")
              .replace("{count}", String(photos.length))
              .replace("{required}", String(minPhotos))}
          </p>
          <TaskProofCamera
            companyName={companyName}
            shopName={shopName}
            staffName={staffName}
            gpsLabel={gpsLabel}
            allowGallery={allowGallery}
            disabled={uploading || busy}
            onCaptured={({ file, previewUrl }) => void handleCaptured(file, previewUrl)}
          />
          {uploading ? (
            <div className="space-y-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-full bg-emerald-600 transition-all"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500">
                {t("tasks.staff.uploadProgress").replace("{percent}", String(uploadPercent))}
              </p>
            </div>
          ) : null}
          {photos.length > 0 ? (
            <ul className="grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <li key={p.storagePath} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.previewUrl}
                    alt=""
                    className="aspect-square w-full rounded border border-zinc-200 object-cover dark:border-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <textarea
        className="w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        placeholder={t("tasks.staff.comment")}
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
      />

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => void handleSubmitClick()}
        className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {uploading ? t("tasks.staff.uploading") : t("tasks.staff.submit")}
      </button>
    </div>
  );
}

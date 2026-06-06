"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { formatMalaysiaRecordedAt } from "@/lib/malaysia-time";
import { compressTaskProofImage } from "@/lib/retail-tasks/task-photo-compress";
import { applyTaskProofOverlay } from "@/lib/retail-tasks/task-proof-overlay";
import {
  captureJpegFromVideo,
  openTaskProofCameraStream,
  SelfieCameraError,
  stopMediaStream,
} from "@/lib/retail-tasks/task-proof-camera";

export type TaskProofCaptureResult = {
  file: File;
  previewUrl: string;
};

type Props = {
  companyName: string;
  shopName: string;
  staffName: string;
  gpsLabel: string;
  allowGallery?: boolean;
  disabled?: boolean;
  onCaptured: (result: TaskProofCaptureResult) => void;
};

type Phase = "idle" | "live" | "processing";

function mapError(err: unknown): string {
  if (err instanceof SelfieCameraError) return err.message;
  if (err instanceof Error) return err.message;
  return "Could not capture photo.";
}

export function TaskProofCamera({
  companyName,
  shopName,
  staffName,
  gpsLabel,
  allowGallery = false,
  disabled,
  onCaptured,
}: Props) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const releaseStream = useCallback(() => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      try {
        video.srcObject = null;
        video.removeAttribute("src");
        video.load();
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    return () => releaseStream();
  }, [releaseStream]);

  const processFile = useCallback(
    async (raw: File) => {
      setPhase("processing");
      setError(null);
      try {
        const compressed = await compressTaskProofImage(raw);
        const capturedAt = new Date();
        const withWatermark = await applyTaskProofOverlay(compressed.file, {
          companyName,
          shopName,
          staffName,
          dateTime: formatMalaysiaRecordedAt(capturedAt.toISOString()),
          gpsLabel,
        });
        const previewUrl = URL.createObjectURL(withWatermark);
        onCaptured({ file: withWatermark, previewUrl });
        setPhase("idle");
      } catch (err) {
        setError(mapError(err));
        setPhase("idle");
      }
    },
    [companyName, gpsLabel, onCaptured, shopName, staffName],
  );

  const startCamera = useCallback(async () => {
    setError(null);
    releaseStream();
    try {
      const stream = await openTaskProofCameraStream();
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Video element missing");
      video.srcObject = stream;
      await video.play();
      setPhase("live");
    } catch (err) {
      setError(mapError(err));
      setPhase("idle");
    }
  }, [releaseStream]);

  const cancelCamera = useCallback(() => {
    releaseStream();
    setPhase("idle");
    setError(null);
  }, [releaseStream]);

  const capture = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    setPhase("processing");
    setError(null);
    try {
      const blob = await captureJpegFromVideo(video, 0.88);
      releaseStream();
      await processFile(new File([blob], "task-proof.jpg", { type: "image/jpeg" }));
    } catch (err) {
      setError(mapError(err));
      setPhase("idle");
    }
  }, [processFile, releaseStream]);

  const onGalleryPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      void processFile(file);
    },
    [processFile],
  );

  const busy = phase === "processing" || disabled;

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {t("tasks.staff.capturePhoto")}
      </p>
      <p className="mt-0.5 text-[10px] text-zinc-500">
        {allowGallery ? t("tasks.staff.cameraOrGalleryHint") : t("tasks.staff.cameraOnlyHint")}
      </p>

      {phase === "live" ? (
        <div className="mt-2 space-y-2">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="aspect-[4/3] w-full rounded-lg bg-black object-cover"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void capture()}
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {t("tasks.staff.captureNow")}
            </button>
            <button
              type="button"
              onClick={cancelCamera}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-600"
            >
              {t("tasks.staff.cancelCamera")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void startCamera()}
            className="w-full rounded-lg bg-zinc-800 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900"
          >
            {phase === "processing" ? t("tasks.staff.processingPhoto") : t("tasks.staff.openCamera")}
          </button>
          {allowGallery ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onGalleryPick}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-xs font-semibold dark:border-zinc-600"
              >
                {t("tasks.staff.chooseGallery")}
              </button>
            </>
          ) : null}
        </div>
      )}

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

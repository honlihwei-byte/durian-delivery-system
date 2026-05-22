"use client";

import { useCallback, useRef, useState } from "react";
import { formatMalaysiaRecordedAt } from "@/lib/malaysia-time";

export type PhotoProofPreview = {
  file: File;
  previewUrl: string;
  capturedAt: Date;
  capturedAtLabel: string;
};

type Props = {
  shopName: string;
  staffName: string;
  gpsStatusLabel: string;
  disabled?: boolean;
  uploading?: boolean;
  uploadError?: string | null;
  uploaded?: boolean;
  onPhotoReady: (preview: PhotoProofPreview | null) => void;
};

export function PhotoProofCapture({
  shopName,
  staffName,
  gpsStatusLabel,
  disabled,
  uploading,
  uploadError,
  uploaded,
  onPhotoReady,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PhotoProofPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearPreview = useCallback(() => {
    if (preview?.previewUrl) URL.revokeObjectURL(preview.previewUrl);
    setPreview(null);
    onPhotoReady(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [onPhotoReady, preview?.previewUrl]);

  const handleFile = useCallback(
    (file: File | undefined) => {
      setError(null);
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("Please capture a photo with your camera.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Photo is too large (max 5 MB).");
        return;
      }
      if (preview?.previewUrl) URL.revokeObjectURL(preview.previewUrl);
      const capturedAt = new Date();
      const next: PhotoProofPreview = {
        file,
        previewUrl: URL.createObjectURL(file),
        capturedAt,
        capturedAtLabel: formatMalaysiaRecordedAt(capturedAt.toISOString()),
      };
      setPreview(next);
      onPhotoReady(next);
    },
    [onPhotoReady, preview?.previewUrl],
  );

  return (
    <section className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-3 text-sm text-violet-950 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100">
      <p className="font-semibold">Indoor verification unstable</p>
      <p className="mt-1 text-xs opacity-90">You can use Photo Proof</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {!preview ? (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="mt-3 w-full rounded-lg bg-violet-700 px-3 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-violet-600"
        >
          Take Photo Proof
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="relative overflow-hidden rounded-lg border border-violet-200 dark:border-violet-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.previewUrl}
              alt="Photo proof preview"
              className="max-h-56 w-full object-cover"
            />
            <div
              className="pointer-events-none absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/55 via-transparent to-black/65 p-2.5 text-white"
              aria-hidden
            >
              <p className="font-mono text-[11px] font-semibold leading-tight drop-shadow sm:text-xs">
                {preview.capturedAtLabel}
              </p>
              <div className="space-y-0.5 text-[11px] font-medium leading-snug drop-shadow sm:text-xs">
                <p>{staffName}</p>
                <p>{shopName}</p>
                <p>Clock In / Clock Out</p>
                <p>{gpsStatusLabel}</p>
              </div>
            </div>
          </div>
          {uploading ? (
            <p className="text-xs font-medium text-violet-800 dark:text-violet-200">
              Uploading photo…
            </p>
          ) : null}
          {uploaded ? (
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              Photo uploaded — tap Clock In or Clock Out below (no GPS required).
            </p>
          ) : null}
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={clearPreview}
            className="w-full rounded-lg border border-violet-400 px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            Retake photo
          </button>
        </div>
      )}

      {error ? <p className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p> : null}
      {uploadError ? (
        <p className="mt-2 text-xs text-red-700 dark:text-red-300">{uploadError}</p>
      ) : null}
    </section>
  );
}

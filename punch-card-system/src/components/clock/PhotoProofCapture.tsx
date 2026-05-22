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
  staffCode: string;
  actionType?: "clock_in" | "clock_out";
  gpsStatusNote: string;
  disabled?: boolean;
  onPhotoReady: (preview: PhotoProofPreview | null) => void;
};

export function PhotoProofCapture({
  shopName,
  staffName,
  staffCode,
  actionType,
  gpsStatusNote,
  disabled,
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
      <p className="mt-1 text-xs opacity-90">
        GPS could not verify after multiple indoor attempts ({gpsStatusNote}). Take a live photo at
        the shop, then tap Clock In or Clock Out.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {!preview ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="mt-3 w-full rounded-lg bg-violet-700 px-3 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-violet-600"
        >
          Use Photo Proof
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.previewUrl}
            alt="Photo proof preview"
            className="max-h-48 w-full rounded-lg border border-violet-200 object-cover dark:border-violet-700"
          />
          <dl className="grid gap-1 text-xs">
            <div>
              <dt className="font-medium opacity-80">Time (Malaysia)</dt>
              <dd>{preview.capturedAtLabel}</dd>
            </div>
            <div>
              <dt className="font-medium opacity-80">Staff</dt>
              <dd>
                {staffName} ({staffCode})
              </dd>
            </div>
            <div>
              <dt className="font-medium opacity-80">Shop</dt>
              <dd>{shopName}</dd>
            </div>
            {actionType ? (
              <div>
                <dt className="font-medium opacity-80">Action</dt>
                <dd>{actionType === "clock_in" ? "Clock In" : "Clock Out"}</dd>
              </div>
            ) : null}
            <div>
              <dt className="font-medium opacity-80">GPS status</dt>
              <dd>{gpsStatusNote}</dd>
            </div>
          </dl>
          <button
            type="button"
            disabled={disabled}
            onClick={clearPreview}
            className="w-full rounded-lg border border-violet-400 px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            Retake photo
          </button>
        </div>
      )}

      {error ? <p className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p> : null}
    </section>
  );
}

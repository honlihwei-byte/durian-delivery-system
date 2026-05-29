"use client";

import { useRef, useState } from "react";
import { compressPhotoProofImage } from "@/lib/photo-proof-compress";
import { applySelfieProofOverlay } from "@/lib/selfie-proof-overlay";

export type SelfieProofPreview = {
  file: File;
  previewUrl: string;
};

type Props = {
  staffName: string;
  shopName: string;
  actionLabel: string;
  dateTimeLabel: string;
  onPhotoReady: (preview: SelfieProofPreview | null) => void;
  uploading?: boolean;
  error?: string | null;
};

export function SelfieProofCapture({
  staffName,
  shopName,
  actionLabel,
  dateTimeLabel,
  onPhotoReady,
  uploading,
  error,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<SelfieProofPreview | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handleFile(file: File | null) {
    if (!file) {
      setPreview(null);
      onPhotoReady(null);
      return;
    }
    setProcessing(true);
    try {
      const compressed = await compressPhotoProofImage(file);
      const withOverlay = await applySelfieProofOverlay(compressed.file, {
        staffName,
        shopName,
        dateTime: dateTimeLabel,
        actionLabel,
      });
      const next: SelfieProofPreview = {
        file: withOverlay,
        previewUrl: URL.createObjectURL(withOverlay),
      };
      setPreview(next);
      onPhotoReady(next);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="rounded-xl border border-sky-300 bg-sky-50/80 p-4 text-sm text-sky-950 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100">
      <p className="font-semibold">Selfie verification required</p>
      <p className="mt-1 text-xs opacity-90">
        Use your front camera. Your name, shop, time, and punch action are stamped on the photo.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="sr-only"
        onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
      />
      {preview ? (
        <div className="mt-3 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.previewUrl}
            alt="Selfie preview"
            className="mx-auto max-h-48 w-full rounded-lg object-contain ring-2 ring-sky-400"
          />
          <button
            type="button"
            className="w-full rounded-lg border border-sky-400 px-3 py-2 text-xs font-semibold"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || processing}
          >
            Retake selfie
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="mt-3 w-full rounded-lg bg-sky-700 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || processing}
        >
          {processing ? "Processing…" : "Take Selfie"}
        </button>
      )}
      {error ? <p className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p> : null}
    </div>
  );
}

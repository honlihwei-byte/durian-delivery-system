export type TaskPhotoUploadProgress = {
  percent: number;
  loaded: number;
  total: number;
};

export function uploadTaskProofWithProgress(
  url: string,
  form: FormData,
  onProgress?: (p: TaskPhotoUploadProgress) => void,
): Promise<{ ok: true; photo_url: string } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (!e.lengthComputable) return;
      onProgress?.({
        percent: Math.min(100, Math.round((e.loaded / e.total) * 100)),
        loaded: e.loaded,
        total: e.total,
      });
    });

    xhr.addEventListener("load", () => {
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(xhr.responseText) as Record<string, unknown>;
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.photo_url) {
        resolve({ ok: true, photo_url: String(body.photo_url) });
        return;
      }
      resolve({ ok: false, error: String(body.error ?? "Upload failed") });
    });

    xhr.addEventListener("error", () => resolve({ ok: false, error: "Network error while uploading." }));
    xhr.open("POST", url);
    xhr.send(form);
  });
}

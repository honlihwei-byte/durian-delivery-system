import { selfieProofDebugLog } from "@/lib/selfie-proof-debug";

export type SelfieAttachParams = {
  attendanceId: string;
  shopId: string;
  punchQrToken: string;
  file: File;
  staffId?: string;
  staffIdentifier?: string;
};

export type SelfieAttachResult =
  | { ok: true; selfie_proof_path: string; selfie_captured_at: string }
  | { ok: false; error: string; retryable: boolean };

function friendlyUploadError(status: number, message: string): string {
  if (status === 408 || message.toLowerCase().includes("timeout")) {
    return "Network timeout";
  }
  if (status >= 500) return "Upload failed";
  if (status === 403 || status === 401) return message || "Upload failed";
  return message || "Upload failed";
}

export async function attachSelfieToAttendance(
  params: SelfieAttachParams,
  signal?: AbortSignal,
): Promise<SelfieAttachResult> {
  const start = performance.now();
  selfieProofDebugLog("upload started", {
    attendanceId: params.attendanceId,
    shopId: params.shopId,
    fileSize: params.file.size,
    bucket: "attendance-selfies",
  });
  try {
    const form = new FormData();
    form.set("shop_id", params.shopId);
    form.set("punch_qr_token", params.punchQrToken);
    form.set("photo", params.file, "selfie.jpg");
    if (params.staffId) form.set("staff_id", params.staffId);
    if (params.staffIdentifier) form.set("staff_identifier", params.staffIdentifier);

    const res = await fetch(
      `/api/attendance/${encodeURIComponent(params.attendanceId)}/attach-selfie`,
      { method: "POST", body: form, signal },
    );
    const data = (await res.json().catch(() => ({}))) as {
      selfie_proof_path?: string;
      selfie_captured_at?: string;
      error?: string;
    };
    const durationMs = Math.round(performance.now() - start);
    selfieProofDebugLog("upload duration", {
      attendanceId: params.attendanceId,
      durationMs,
      ok: res.ok,
      fileSize: params.file.size,
    });

    if (!res.ok) {
      selfieProofDebugLog("upload failed response", {
        status: res.status,
        error: data.error,
      });
      return {
        ok: false,
        error: friendlyUploadError(res.status, data.error ?? "Upload failed"),
        retryable: res.status >= 500 || res.status === 408 || res.status === 429,
      };
    }
    if (!data.selfie_proof_path) {
      return { ok: false, error: "Upload failed", retryable: true };
    }
    selfieProofDebugLog("upload success", {
      attendanceId: params.attendanceId,
      storagePath: data.selfie_proof_path,
      durationMs,
    });
    return {
      ok: true,
      selfie_proof_path: data.selfie_proof_path,
      selfie_captured_at: data.selfie_captured_at ?? new Date().toISOString(),
    };
  } catch (e) {
    const durationMs = Math.round(performance.now() - start);
    selfieProofDebugLog("upload failed", {
      attendanceId: params.attendanceId,
      durationMs,
      error: e instanceof Error ? e.message : String(e),
    });
    if (e instanceof DOMException && e.name === "AbortError") {
      return { ok: false, error: "Upload cancelled", retryable: false };
    }
    const msg = e instanceof Error ? e.message : "Upload failed";
    const timeout = /timeout|network/i.test(msg);
    return {
      ok: false,
      error: timeout ? "Network timeout" : "Upload failed",
      retryable: true,
    };
  }
}

const MAX_RETRIES = 4;
const RETRY_DELAYS_MS = [2000, 4000, 8000, 12000];

export function scheduleSelfieBackgroundUpload(
  params: SelfieAttachParams,
  onStatus: (message: string | null) => void,
): () => void {
  let cancelled = false;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const controller = new AbortController();

  async function run() {
    if (cancelled) return;
    attempt += 1;
    onStatus(
      attempt === 1
        ? null
        : "Selfie upload pending. Retrying…",
    );
    const result = await attachSelfieToAttendance(params, controller.signal);
    if (cancelled) return;
    if (result.ok) {
      onStatus(null);
      selfieProofDebugLog("upload URL", {
        attendanceId: params.attendanceId,
        storagePath: result.selfie_proof_path,
        bucket: "attendance-selfies",
      });
      return;
    }
    if (!result.retryable || attempt >= MAX_RETRIES) {
      onStatus(
        result.error === "Network timeout"
          ? "Selfie upload pending. Retrying…"
          : `Selfie upload pending. ${result.error}`,
      );
      return;
    }
    onStatus("Selfie upload pending. Retrying…");
    const delay = RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)]!;
    timer = setTimeout(() => void run(), delay);
  }

  void run();

  return () => {
    cancelled = true;
    controller.abort();
    if (timer != null) clearTimeout(timer);
  };
}

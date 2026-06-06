import {
  SelfieCameraError,
  stopMediaStream,
  captureJpegFromVideo,
} from "@/lib/selfie-camera-capture";

export { SelfieCameraError, stopMediaStream, captureJpegFromVideo };

export function isTaskProofCameraSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

function mapCameraError(err: unknown): SelfieCameraError {
  if (err instanceof SelfieCameraError) return err;
  const name =
    err && typeof err === "object" && "name" in err
      ? String((err as { name: string }).name)
      : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return new SelfieCameraError("permission_denied", "Camera permission denied");
  }
  return new SelfieCameraError(
    "camera_unavailable",
    err instanceof Error ? err.message : "Camera unavailable",
  );
}

/** Rear/environment camera for task proof — no gallery fallback. */
export async function openTaskProofCameraStream(): Promise<MediaStream> {
  if (!isTaskProofCameraSupported()) {
    throw new SelfieCameraError("not_supported", "Camera not supported in this browser");
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
      },
    });
  } catch (err) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
      });
    } catch (fallbackErr) {
      throw mapCameraError(fallbackErr);
    }
  }
}

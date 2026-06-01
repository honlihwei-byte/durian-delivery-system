export function selfieProofDebugEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    (typeof window !== "undefined" &&
      (window as unknown as { __SELFIE_DEBUG?: boolean }).__SELFIE_DEBUG === true)
  );
}

export function selfieProofDebugLog(
  label: string,
  data?: Record<string, unknown>,
): void {
  if (!selfieProofDebugEnabled()) return;
  if (data) {
    console.log(`[selfie-proof] ${label}`, data);
  } else {
    console.log(`[selfie-proof] ${label}`);
  }
}

/** Full punch pipeline log (always in development). */
export function selfiePunchPipelineLog(
  step:
    | "selfie captured"
    | "upload started"
    | "upload success"
    | "upload URL"
    | "database saved"
    | "database attach saved",
  data: Record<string, unknown>,
): void {
  if (!selfieProofDebugEnabled()) return;
  console.log(`[selfie-pipeline] ${step}`, data);
}

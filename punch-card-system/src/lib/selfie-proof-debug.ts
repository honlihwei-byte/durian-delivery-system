export function selfieProofDebugEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    (typeof window !== "undefined" &&
      (window as unknown as { __SELFIE_DEBUG?: boolean }).__SELFIE_DEBUG === true)
  );
}

export function selfieProofDebugLog(
  label: string,
  data: Record<string, unknown>,
): void {
  if (!selfieProofDebugEnabled()) return;
  console.log(`[selfie-proof] ${label}`, data);
}

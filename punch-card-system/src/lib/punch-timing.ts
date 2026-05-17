const PUNCH_TIMING_ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_PUNCH_TIMING === "1";

export function isPunchTimingEnabled(): boolean {
  return PUNCH_TIMING_ENABLED;
}

export function punchMark(label: string): void {
  if (!PUNCH_TIMING_ENABLED) return;
  console.log(`[punch-timing] ▶ ${label}`);
}

export function punchTime(label: string, startMs: number, extra?: string): number {
  const elapsed = performance.now() - startMs;
  if (PUNCH_TIMING_ENABLED) {
    const suffix = extra ? ` (${extra})` : "";
    console.log(`[punch-timing] ${label}: ${elapsed.toFixed(0)}ms${suffix}`);
  }
  return elapsed;
}

export function punchTimeStart(): number {
  return performance.now();
}

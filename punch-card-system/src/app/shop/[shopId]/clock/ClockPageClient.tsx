"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ClockErrorBoundary } from "@/components/ClockErrorBoundary";
import { normalizePunchQrToken } from "@/lib/punch-qr-url";
import { ClockScreenSkeleton } from "./ClockScreenSkeleton";

const ClockScreen = dynamic(
  () => import("./ClockScreen").then((m) => ({ default: m.ClockScreen })),
  {
    ssr: false,
    loading: () => <ClockScreenSkeleton />,
  },
);

export function ClockPageClient({ shopId }: { shopId: string }) {
  const searchParams = useSearchParams();
  const punchQrToken = normalizePunchQrToken(searchParams.get("t"));

  return (
    <ClockErrorBoundary>
      <ClockScreen shopId={shopId} punchQrToken={punchQrToken} />
    </ClockErrorBoundary>
  );
}

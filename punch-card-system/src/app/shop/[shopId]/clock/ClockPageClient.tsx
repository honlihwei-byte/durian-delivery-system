"use client";

import dynamic from "next/dynamic";
import { ClockErrorBoundary } from "@/components/ClockErrorBoundary";
import { ClockScreenSkeleton } from "./ClockScreenSkeleton";

const ClockScreen = dynamic(
  () => import("./ClockScreen").then((m) => ({ default: m.ClockScreen })),
  {
    ssr: false,
    loading: () => <ClockScreenSkeleton message="Opening clock…" />,
  },
);

export function ClockPageClient({ shopId }: { shopId: string }) {
  return (
    <ClockErrorBoundary>
      <ClockScreen shopId={shopId} />
    </ClockErrorBoundary>
  );
}

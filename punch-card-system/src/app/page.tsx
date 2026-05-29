import type { Metadata } from "next";
import { HomeLanding } from "@/components/marketing/HomeLanding";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: "Stop Chasing Staff Attendance — LW OpsFlow",
  description:
    "GPS + QR staff attendance with anti buddy-punch protection for retail, malls, and multi-branch SMEs. 14-day free trial, no credit card.",
};

export default function Home() {
  return (
    <MarketingShell>
      <HomeLanding />
    </MarketingShell>
  );
}

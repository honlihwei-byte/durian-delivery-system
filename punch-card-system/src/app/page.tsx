import type { Metadata } from "next";
import { HomeLanding } from "@/components/marketing/HomeLanding";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: "Stop Chasing Staff. Know Who Is Actually On Site. — LW OpsFlow",
  description:
    "GPS + QR clock in/out with anti buddy-punch controls, shift schedules, and multi-shop attendance reports. 14-day free trial, no credit card.",
};

export default function Home() {
  return (
    <MarketingShell>
      <HomeLanding />
    </MarketingShell>
  );
}

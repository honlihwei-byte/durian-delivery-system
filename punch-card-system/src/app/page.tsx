import type { Metadata } from "next";
import { HomeLanding } from "@/components/marketing/HomeLanding";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: "Punch Card System — GPS + QR Staff Attendance",
  description:
    "GPS + QR staff attendance for shops and businesses. 14-day free trial.",
};

export default function Home() {
  return (
    <MarketingShell>
      <HomeLanding />
    </MarketingShell>
  );
}

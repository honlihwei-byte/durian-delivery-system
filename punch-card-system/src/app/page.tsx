import type { Metadata } from "next";
import { HomeLanding } from "@/components/marketing/HomeLanding";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: "OpsFlow Attendance — Smart GPS + QR Staff Attendance",
  description:
    "OpsFlow Attendance by LW OpsFlow. Smart GPS + QR attendance for shops and SMEs. 14-day free trial.",
};

export default function Home() {
  return (
    <MarketingShell>
      <HomeLanding />
    </MarketingShell>
  );
}

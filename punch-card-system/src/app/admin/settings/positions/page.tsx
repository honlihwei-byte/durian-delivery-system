import type { Metadata } from "next";
import { PositionsManager } from "@/components/admin/positions/PositionsManager";

export const metadata: Metadata = {
  title: "Position & Permission Settings — LW OpsFlow",
};

export default function PositionsSettingsPage() {
  return <PositionsManager />;
}

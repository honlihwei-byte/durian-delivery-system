"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Shop, Staff } from "@/components/admin/report/AttendanceReportPanel";
import { PageGuide } from "@/components/help/PageGuide";
import { SetupProgressChecklist } from "@/components/help/SetupProgressChecklist";

const AttendanceReportPanel = dynamic(
  () =>
    import("@/components/admin/report/AttendanceReportPanel").then((m) => ({
      default: m.AttendanceReportPanel,
    })),
  {
    loading: () => (
      <p className="rounded-2xl border border-dashed border-[#E2E8F0] bg-white px-6 py-16 text-center text-sm text-[#64748B] shadow-sm">
        Loading dashboard…
      </p>
    ),
  },
);

type ReportView = "attendance" | "absent";

export function AdminDashboard() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reportView, setReportView] = useState<ReportView>("attendance");

  useEffect(() => {
    void (async () => {
      try {
        const [shopRes, staffRes] = await Promise.all([
          fetch("/api/shops", { credentials: "include" }),
          fetch("/api/staff", { credentials: "include" }),
        ]);
        const shopJson = await shopRes.json();
        const staffJson = await staffRes.json();
        if (!shopRes.ok) throw new Error(shopJson.error || "Failed to load shops");
        setShops((shopJson.shops ?? []) as Shop[]);
        setStaff((staffJson.staff ?? []) as Staff[]);
        if (!staffRes.ok) setStaff([]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <SetupProgressChecklist />
      <PageGuide pageId="dashboard" />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">Dashboard</h1>
          <p className="mt-1 text-sm font-normal text-[#64748B]">
            Real-time attendance, GPS audit, and exportable reports.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-[#E2E8F0] bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setReportView("attendance")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              reportView === "attendance"
                ? "bg-[#2563EB] text-white shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Attendance
          </button>
          <button
            type="button"
            onClick={() => setReportView("absent")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              reportView === "absent"
                ? "bg-[#F59E0B] text-white shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Absent
          </button>
        </div>
      </header>

      <PageGuide pageId="attendance" />
      <PageGuide pageId="reports" />

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <AttendanceReportPanel shops={shops} staff={staff} reportView={reportView} />
    </div>
  );
}

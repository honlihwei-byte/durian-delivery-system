"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Shop, Staff } from "@/components/admin/report/AttendanceReportPanel";
import { PageGuide } from "@/components/help/PageGuide";
import { SetupProgressChecklist } from "@/components/help/SetupProgressChecklist";
import { dashboardSecondaryBtn } from "@/components/admin/report/dashboard-ui";

const AttendanceReportPanel = dynamic(
  () =>
    import("@/components/admin/report/AttendanceReportPanel").then((m) => ({
      default: m.AttendanceReportPanel,
    })),
  {
    loading: () => (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-sm">
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
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    void (async () => {
      try {
        const [shopRes, staffRes, sessionRes] = await Promise.all([
          fetch("/api/shops", { credentials: "include" }),
          fetch("/api/staff", { credentials: "include" }),
          fetch("/api/admin/auth/session", { credentials: "include" }),
        ]);
        const shopJson = await shopRes.json();
        const staffJson = await staffRes.json();
        const sessionJson = await sessionRes.json();
        if (!shopRes.ok) throw new Error(shopJson.error || "Failed to load shops");
        setShops((shopJson.shops ?? []) as Shop[]);
        setStaff((staffJson.staff ?? []) as Staff[]);
        if (!staffRes.ok) setStaff([]);
        if (sessionJson.company?.name) setCompanyName(String(sessionJson.company.name));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <SetupProgressChecklist />
      <PageGuide pageId="dashboard" />

      <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[#2563EB]">Dashboard</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Attendance overview
          </h1>
          <p className="max-w-2xl text-sm font-normal text-slate-500">
            {companyName ? (
              <>
                <span className="font-medium text-slate-700">{companyName}</span> · Real-time attendance,
                GPS audit, and exportable reports.
              </>
            ) : (
              <>Real-time attendance, GPS audit, and exportable reports for your company.</>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setReportView("attendance")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                reportView === "attendance"
                  ? "bg-[#2563EB] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
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
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Absent
            </button>
          </div>
          <Link href="/admin/shops" className={dashboardSecondaryBtn}>
            Shops
          </Link>
          <Link href="/admin/staff" className={dashboardSecondaryBtn}>
            Staff
          </Link>
          <Link href="/admin/risk-review" className={dashboardSecondaryBtn}>
            Risk review
          </Link>
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

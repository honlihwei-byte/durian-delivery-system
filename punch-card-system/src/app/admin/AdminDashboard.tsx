"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AttendanceReportPanel, type Shop, type Staff } from "@/components/admin/report/AttendanceReportPanel";

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
          fetch("/api/shops"),
          fetch("/api/staff"),
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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Attendance</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Management reports with GPS audit, issues, and CSV export. Configure shops and staff under{" "}
            <Link href="/admin/shops" className="font-medium text-blue-600 underline dark:text-blue-400">
              Shops
            </Link>{" "}
            and{" "}
            <Link href="/admin/staff" className="font-medium text-blue-600 underline dark:text-blue-400">
              Staff
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/shops"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-600 dark:text-zinc-100"
          >
            Shops
          </Link>
          <Link
            href="/admin/staff"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-600 dark:text-zinc-100"
          >
            Staff
          </Link>
          <Link
            href="/admin/photo-proof"
            className="inline-flex items-center justify-center rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100"
          >
            Photo Proof Review
          </Link>
          <Link
            href="/admin/forgot-punch"
            className="inline-flex items-center justify-center rounded-lg border border-teal-300 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100"
          >
            Forgot Punch Requests
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Report:</span>
        <button
          type="button"
          onClick={() => setReportView("attendance")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            reportView === "attendance"
              ? "bg-emerald-600 text-white"
              : "border border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900"
          }`}
        >
          Attendance
        </button>
        <button
          type="button"
          onClick={() => setReportView("absent")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            reportView === "absent"
              ? "bg-amber-600 text-white"
              : "border border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900"
          }`}
        >
          Absent report
        </button>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <AttendanceReportPanel shops={shops} staff={staff} reportView={reportView} />
    </div>
  );
}


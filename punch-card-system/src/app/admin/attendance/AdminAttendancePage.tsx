"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Shop, Staff } from "@/components/admin/report/AttendanceReportPanel";
import { ForgotPunchReviewPanel } from "@/components/admin/ForgotPunchReviewPanel";

type ForgotStaff = { id: string; staff_name: string; staff_code: string };
import { PageGuide } from "@/components/help/PageGuide";

const AttendanceReportPanel = dynamic(
  () =>
    import("@/components/admin/report/AttendanceReportPanel").then((m) => ({
      default: m.AttendanceReportPanel,
    })),
  {
    loading: () => (
      <p className="rounded-2xl border border-dashed border-[#E2E8F0] bg-white px-6 py-16 text-center text-sm text-[#64748B]">
        Loading attendance…
      </p>
    ),
  },
);

type AttendanceTab = "daily" | "history" | "forgot";

const TABS: { id: AttendanceTab; label: string }[] = [
  { id: "daily", label: "Daily Attendance" },
  { id: "history", label: "Attendance History" },
  { id: "forgot", label: "Forgot Punch Requests" },
];

function parseTab(raw: string | null): AttendanceTab {
  if (raw === "history" || raw === "forgot") return raw;
  return "daily";
}

export function AdminAttendancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  const [shops, setShops] = useState<Shop[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [forgotStaff, setForgotStaff] = useState<ForgotStaff[]>([]);
  const [error, setError] = useState<string | null>(null);

  const setTab = useCallback(
    (next: AttendanceTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "daily") params.delete("tab");
      else params.set("tab", next);
      const q = params.toString();
      router.replace(q ? `/admin/attendance?${q}` : "/admin/attendance");
    },
    [router, searchParams],
  );

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
        const staffList = (staffJson.staff ?? []) as Array<
          Staff & { staff_code?: string }
        >;
        setStaff(staffList);
        setForgotStaff(
          staffList.map((s) => ({
            id: s.id,
            staff_name: s.staff_name,
            staff_code: s.staff_code ?? "",
          })),
        );
        if (!staffRes.ok) {
          setStaff([]);
          setForgotStaff([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">Attendance</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          See who clocked in, review monthly history, and approve missed punches.
        </p>
      </header>

      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-[#E2E8F0] bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? "bg-[#2563EB] text-white shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <PageGuide pageId="attendance" />

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {tab === "daily" ? (
        <AttendanceReportPanel shops={shops} staff={staff} reportView="attendance" initialMode="day" />
      ) : null}

      {tab === "history" ? (
        <AttendanceReportPanel shops={shops} staff={staff} reportView="attendance" initialMode="month" />
      ) : null}

      {tab === "forgot" ? (
        <ForgotPunchReviewPanel shops={shops} staff={forgotStaff} />
      ) : null}
    </div>
  );
}

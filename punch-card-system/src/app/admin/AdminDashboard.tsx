"use client";

import Link from "next/link";
import { PageGuide } from "@/components/help/PageGuide";
import { SetupProgressChecklist } from "@/components/help/SetupProgressChecklist";

const QUICK_LINKS = [
  {
    href: "/admin/attendance",
    title: "Daily attendance",
    desc: "See who is in, late, or missing today.",
  },
  {
    href: "/admin/attendance?tab=forgot",
    title: "Forgot punch requests",
    desc: "Approve staff corrections for missed clock in/out.",
  },
  {
    href: "/admin/shift-schedule",
    title: "Schedule",
    desc: "Set shifts and weekly staff timetables.",
  },
  {
    href: "/admin/shops",
    title: "Shops",
    desc: "GPS, QR codes, and security per location.",
  },
] as const;

export function AdminDashboard() {
  return (
    <div className="mx-auto max-w-[900px] space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <SetupProgressChecklist />
      <PageGuide pageId="dashboard" />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Your store overview. Open Attendance for punch logs and exports.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {QUICK_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:border-[#2563EB]/40 hover:shadow-md"
          >
            <h2 className="text-sm font-semibold text-[#0F172A]">{item.title}</h2>
            <p className="mt-1 text-xs text-[#64748B]">{item.desc}</p>
          </Link>
        ))}
      </div>

      <p className="text-center text-sm text-[#64748B]">
        <Link href="/admin/attendance" className="font-semibold text-[#2563EB] hover:underline">
          Go to Attendance →
        </Link>
      </p>
    </div>
  );
}

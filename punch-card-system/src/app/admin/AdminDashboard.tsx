"use client";

import Link from "next/link";
import { useState } from "react";
import { OperationsDashboard } from "@/components/admin/OperationsDashboard";
import { PageGuide } from "@/components/help/PageGuide";
import { SetupProgressChecklist } from "@/components/help/SetupProgressChecklist";
import { useI18n } from "@/components/i18n/LanguageProvider";

type TabId = "intelligence" | "dashboard";

const QUICK_ACTIONS = [
  {
    href: "/admin/attendance",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    color: "bg-blue-50 text-blue-600",
    titleKey: "dashboard.quickDaily.title",
    descKey: "dashboard.quickDaily.desc",
  },
  {
    href: "/admin/shift-schedule",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: "bg-violet-50 text-violet-600",
    titleKey: "dashboard.quickSchedule.title",
    descKey: "dashboard.quickSchedule.desc",
  },
  {
    href: "/admin/shops",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    color: "bg-emerald-50 text-emerald-600",
    titleKey: "dashboard.quickShops.title",
    descKey: "dashboard.quickShops.desc",
  },
  {
    href: "/admin/staff",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: "bg-sky-50 text-sky-600",
    titleKey: "nav.staff",
    descKey: "staff.subtitle",
  },
  {
    href: "/admin/tasks",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    color: "bg-orange-50 text-orange-600",
    titleKey: "nav.tasks",
    descKey: "tasks.subtitle",
  },
  {
    href: "/admin/security",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    color: "bg-rose-50 text-rose-600",
    titleKey: "dashboard.operations.actions.security",
    descKey: "dashboard.operations.actions.reviewIssues",
  },
] as const;

export function AdminDashboard() {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabId>("intelligence");

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">
            {tab === "intelligence"
              ? t("dashboard.operations.title")
              : t("dashboard.title")}
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            {tab === "intelligence"
              ? t("dashboard.operations.subtitle")
              : t("dashboard.subtitle")}
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setTab("intelligence")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
              tab === "intelligence"
                ? "bg-white text-[#0F172A] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            {t("dashboard.operations.tabIntelligence")}
          </button>
          <button
            type="button"
            onClick={() => setTab("dashboard")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
              tab === "dashboard"
                ? "bg-white text-[#0F172A] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            {t("dashboard.operations.tabDashboard")}
          </button>
        </div>
      </header>

      {tab === "intelligence" ? (
        <OperationsDashboard />
      ) : (
        <div className="space-y-6">
          <SetupProgressChecklist />
          <PageGuide pageId="dashboard" />

          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[#0F172A]">
              {t("dashboard.operations.quickActions")}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm transition hover:border-[#2563EB]/30 hover:shadow-md"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${action.color} transition group-hover:scale-105`}>
                    {action.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A]">{t(action.titleKey)}</p>
                    <p className="mt-0.5 text-xs text-[#64748B] leading-relaxed">{t(action.descKey)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <p className="text-center text-sm text-[#64748B]">
            <Link href="/admin/attendance" className="font-semibold text-[#2563EB] hover:underline">
              {t("dashboard.goToAttendance")}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

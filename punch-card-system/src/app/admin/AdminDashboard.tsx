"use client";

import Link from "next/link";
import { useState } from "react";
import { OperationsDashboard } from "@/components/admin/OperationsDashboard";
import { PageGuide } from "@/components/help/PageGuide";
import { SetupProgressChecklist } from "@/components/help/SetupProgressChecklist";
import { useI18n } from "@/components/i18n/LanguageProvider";

type TabId = "intelligence" | "dashboard";

export function AdminDashboard() {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabId>("intelligence");

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">
          {tab === "intelligence"
            ? t("dashboard.operations.title")
            : t("dashboard.title")}
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          {tab === "intelligence"
            ? t("dashboard.operations.subtitle")
            : t("dashboard.subtitle")}
        </p>
        <div className="mt-4 inline-flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1">
          <button
            type="button"
            onClick={() => setTab("intelligence")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
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
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
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
          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-[#0F172A]">
              {t("dashboard.operations.quickActions")}
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  {
                    href: "/admin/attendance",
                    title: t("dashboard.quickDaily.title"),
                    desc: t("dashboard.quickDaily.desc"),
                  },
                  {
                    href: "/admin/shift-schedule",
                    title: t("dashboard.quickSchedule.title"),
                    desc: t("dashboard.quickSchedule.desc"),
                  },
                  {
                    href: "/admin/shops",
                    title: t("dashboard.quickShops.title"),
                    desc: t("dashboard.quickShops.desc"),
                  },
                  {
                    href: "/admin/staff",
                    title: t("nav.staff"),
                    desc: t("staff.subtitle"),
                  },
                  {
                    href: "/admin/tasks",
                    title: t("nav.tasks"),
                    desc: t("tasks.subtitle"),
                  },
                  {
                    href: "/admin/security",
                    title: t("dashboard.operations.actions.security"),
                    desc: t("dashboard.operations.actions.reviewIssues"),
                  },
                ] as const
              ).map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-sm hover:border-[#2563EB]/40"
                >
                  <p className="text-sm font-semibold text-[#2563EB]">{action.title}</p>
                  <p className="mt-1 text-xs text-[#64748B]">{action.desc}</p>
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

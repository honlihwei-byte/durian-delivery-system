"use client";

import Link from "next/link";
import { PageGuide } from "@/components/help/PageGuide";
import { SetupProgressChecklist } from "@/components/help/SetupProgressChecklist";
import { useI18n } from "@/components/i18n/LanguageProvider";

const QUICK_LINK_KEYS = [
  { href: "/admin/attendance", titleKey: "dashboard.quickDaily.title", descKey: "dashboard.quickDaily.desc" },
  {
    href: "/admin/attendance?tab=forgot",
    titleKey: "dashboard.quickForgot.title",
    descKey: "dashboard.quickForgot.desc",
  },
  {
    href: "/admin/shift-schedule",
    titleKey: "dashboard.quickSchedule.title",
    descKey: "dashboard.quickSchedule.desc",
  },
  { href: "/admin/shops", titleKey: "dashboard.quickShops.title", descKey: "dashboard.quickShops.desc" },
] as const;

export function AdminDashboard() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-[900px] space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <SetupProgressChecklist />
      <PageGuide pageId="dashboard" />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">{t("dashboard.title")}</h1>
        <p className="mt-1 text-sm text-[#64748B]">{t("dashboard.subtitle")}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {QUICK_LINK_KEYS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:border-[#2563EB]/40 hover:shadow-md"
          >
            <h2 className="text-sm font-semibold text-[#0F172A]">{t(item.titleKey)}</h2>
            <p className="mt-1 text-xs text-[#64748B]">{t(item.descKey)}</p>
          </Link>
        ))}
      </div>

      <p className="text-center text-sm text-[#64748B]">
        <Link href="/admin/attendance" className="font-semibold text-[#2563EB] hover:underline">
          {t("dashboard.goToAttendance")}
        </Link>
      </p>
    </div>
  );
}

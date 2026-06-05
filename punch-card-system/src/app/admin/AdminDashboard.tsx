"use client";

import Link from "next/link";
import { OperationsDashboard } from "@/components/admin/OperationsDashboard";
import { PageGuide } from "@/components/help/PageGuide";
import { SetupProgressChecklist } from "@/components/help/SetupProgressChecklist";
import { useI18n } from "@/components/i18n/LanguageProvider";

export function AdminDashboard() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">{t("dashboard.title")}</h1>
        <p className="mt-1 text-sm text-[#64748B]">{t("dashboard.subtitle")}</p>
      </header>

      <OperationsDashboard />

      <details className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-[#0F172A]">
          {t("dashboard.goToAttendance")}
        </summary>
        <div className="mt-4 space-y-4">
          <SetupProgressChecklist />
          <PageGuide pageId="dashboard" />
          <p className="text-center text-sm text-[#64748B]">
            <Link href="/admin/attendance" className="font-semibold text-[#2563EB] hover:underline">
              {t("dashboard.goToAttendance")}
            </Link>
          </p>
        </div>
      </details>
    </div>
  );
}

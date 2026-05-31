import Link from "next/link";
import { PageGuide } from "@/components/help/PageGuide";
import {
  dashboardCard,
  dashboardPrimaryBtn,
  dashboardSecondaryBtn,
} from "@/components/admin/report/dashboard-ui";

export default function ShiftScheduleHelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <h1 className="text-2xl font-semibold text-[#0F172A]">Shift Schedule</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Set operating hours and assign staff shifts for each shop outlet.
        </p>
      </header>

      <section className={`${dashboardCard} p-6 sm:p-8`}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl space-y-2">
            <h2 className="text-lg font-semibold text-[#0F172A]">Manage Shops &amp; Shift Schedule</h2>
            <p className="text-sm font-normal leading-relaxed text-[#64748B]">
              Add shops, configure operating hours and set staff schedules for each outlet.
            </p>
            <p className="text-xs font-medium text-[#64748B]">
              <span className="font-semibold text-[#2563EB]">Tip:</span> Add your shops first before
              creating staff schedules.
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/admin/shops" className={dashboardSecondaryBtn}>
              Manage Shops
            </Link>
            <Link href="/admin/shops" className={dashboardPrimaryBtn}>
              Create Schedule
            </Link>
          </div>
        </div>
      </section>

      <PageGuide pageId="shift-schedule" />
    </div>
  );
}

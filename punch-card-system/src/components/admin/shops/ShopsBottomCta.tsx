import { dashboardPrimaryBtn } from "@/components/admin/report/dashboard-ui";

type Props = {
  onAddShop: () => void;
};

export function ShopsBottomCta({ onAddShop }: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#E2E8F0] bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-lg font-bold text-white">
          +
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0F172A]">Can&apos;t find your shop?</p>
          <p className="mt-0.5 text-sm text-[#64748B]">
            Add a new shop to start scheduling shifts and managing your team.
          </p>
        </div>
      </div>
      <button type="button" onClick={onAddShop} className={`${dashboardPrimaryBtn} shrink-0`}>
        + Add New Shop
      </button>
    </div>
  );
}

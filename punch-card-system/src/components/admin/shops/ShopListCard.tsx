"use client";

import { schedulingFromShop } from "@/components/admin/shops/ShopOperatingHoursFields";
import { ShopPhotoDisplay } from "@/components/admin/shops/ShopPhotoField";
import {
  dashboardCard,
  dashboardPrimaryBtn,
  dashboardSecondaryBtn,
} from "@/components/admin/report/dashboard-ui";

export type ShopCardData = {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  gps_indoor_mode?: boolean;
  work_time_mode?: string;
  opening_time?: string | null;
  closing_time?: string | null;
  break_minutes?: number | null;
};

export type ShopCardStats = {
  employeeCount: number;
  activeShiftsToday: number;
};

function shopAddressLabel(shop: ShopCardData): string {
  if (shop.latitude != null && shop.longitude != null) {
    return `${Number(shop.latitude).toFixed(4)}, ${Number(shop.longitude).toFixed(4)}`;
  }
  return "Location not set — add GPS in shop settings";
}

function shopStatus(shop: ShopCardData): { label: string; tone: "success" | "warning" | "neutral" } {
  const hasGps = shop.latitude != null && shop.longitude != null;
  if (!hasGps) return { label: "Setup required", tone: "warning" };
  const sched = schedulingFromShop(shop);
  if (sched.work_time_mode === "shift_based") return { label: "Active · Shift based", tone: "success" };
  return { label: "Active · Fixed hours", tone: "success" };
}

const STATUS_CLASS = {
  success: "bg-emerald-50 text-[#22C55E] ring-1 ring-emerald-200",
  warning: "bg-amber-50 text-[#F59E0B] ring-1 ring-amber-200",
  neutral: "bg-slate-100 text-[#64748B] ring-1 ring-slate-200",
};

type Props = {
  shop: ShopCardData;
  stats: ShopCardStats;
  expanded?: boolean;
  onOpenSchedule: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function ShopListCard({
  shop,
  stats,
  expanded,
  onOpenSchedule,
  onEdit,
  onDelete,
}: Props) {
  const status = shopStatus(shop);
  const sched = schedulingFromShop(shop);

  return (
    <article className={`${dashboardCard} overflow-hidden transition-shadow hover:shadow-md`}>
      <div className="relative h-36 w-full overflow-hidden border-b border-[#E2E8F0]">
        <ShopPhotoDisplay shopId={shop.id} shopName={shop.name} className="h-full w-full" />
        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLASS[status.tone]}`}
        >
          {status.label}
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold text-[#0F172A]">{shop.name}</h2>
          <p className="mt-1 text-sm text-[#64748B]">{shopAddressLabel(shop)}</p>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[#64748B]">Employees</dt>
            <dd className="mt-0.5 text-lg font-bold text-[#0F172A]">{stats.employeeCount}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[#64748B]">Active shifts</dt>
            <dd className="mt-0.5 text-lg font-bold text-[#0F172A]">{stats.activeShiftsToday}</dd>
          </div>
        </dl>

        <p className="text-xs text-[#64748B]">
          {sched.work_time_mode === "fixed"
            ? `Hours ${sched.opening_time ?? "—"}–${sched.closing_time ?? "—"}`
            : "Shift-based scheduling"}
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={onOpenSchedule} className={dashboardPrimaryBtn}>
            {expanded ? "Close schedule" : "Open Schedule"}
          </button>
          <button type="button" onClick={onEdit} className={dashboardSecondaryBtn}>
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

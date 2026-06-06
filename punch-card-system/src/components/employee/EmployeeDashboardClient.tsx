"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/i18n/LanguageProvider";

type DashboardData = {
  clock_context: {
    resolution: string;
    scheduled_shift: {
      shop_name: string;
      start_time: string;
      end_time: string;
      is_off_day: boolean;
    } | null;
    selected_shop_id: string | null;
    assigned_shops: Array<{ id: string; name: string }>;
    can_clock: boolean;
    block_message: string | null;
  };
  today_status: { status?: string; status_label?: string } | null;
  pending_tasks: number;
  unread_notifications: number;
};

export function EmployeeDashboardClient() {
  const { t } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employee/dashboard", { credentials: "include" });
      if (res.ok) setData((await res.json()) as DashboardData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-zinc-500">{t("employee.dashboard.loading")}</p>;
  }

  if (!data) {
    return <p className="text-sm text-red-600">Failed to load dashboard.</p>;
  }

  const ctx = data.clock_context;
  const shift = ctx.scheduled_shift;
  const shopName =
    shift?.shop_name ||
    ctx.assigned_shops.find((s) => s.id === ctx.selected_shop_id)?.name ||
    "";

  const clockHref = ctx.selected_shop_id
    ? `/employee/clock?shop_id=${encodeURIComponent(ctx.selected_shop_id)}`
    : "/employee/clock";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t("employee.dashboard.title")}</h1>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold">{t("employee.dashboard.todayShift")}</h2>
        {shift ? (
          shift.is_off_day ? (
            <p className="mt-1 text-sm text-zinc-600">{t("employee.dashboard.offDay")}</p>
          ) : (
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
              {shift.shop_name} · {shift.start_time} – {shift.end_time}
            </p>
          )
        ) : (
          <p className="mt-1 text-sm text-zinc-500">{t("employee.dashboard.noShift")}</p>
        )}
        {shopName ? (
          <p className="mt-2 text-xs text-zinc-500">
            {t("employee.dashboard.assignedShop")}: {shopName}
          </p>
        ) : null}
      </section>

      {ctx.block_message === "no_shop_assigned" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {t("employee.dashboard.noShopAssigned")}
        </p>
      ) : ctx.can_clock ? (
        <Link
          href={clockHref}
          className="block rounded-lg bg-emerald-600 py-3 text-center text-sm font-semibold text-white"
        >
          {t("employee.dashboard.clockIn")}
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/employee/tasks"
          className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <p className="text-xs text-zinc-500">{t("employee.dashboard.pendingTasks")}</p>
          <p className="text-2xl font-bold">{data.pending_tasks}</p>
        </Link>
        <Link
          href="/employee/notifications"
          className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <p className="text-xs text-zinc-500">{t("employee.dashboard.unreadNotifications")}</p>
          <p className="text-2xl font-bold">{data.unread_notifications}</p>
        </Link>
      </div>

      {data.today_status ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold">{t("employee.dashboard.todayStatus")}</h2>
          <p className="mt-1 text-sm">{data.today_status.status_label ?? data.today_status.status}</p>
        </section>
      ) : null}
    </div>
  );
}

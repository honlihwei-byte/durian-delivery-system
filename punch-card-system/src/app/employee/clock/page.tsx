"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { EmployeeSessionGate } from "@/components/employee/EmployeeSessionGate";
import { isValidShopId } from "@/lib/shop-id";
import { ClockScreenSkeleton } from "@/app/shop/[shopId]/clock/ClockScreenSkeleton";

const ClockScreen = dynamic(
  () => import("@/app/shop/[shopId]/clock/ClockScreen").then((m) => ({ default: m.ClockScreen })),
  { ssr: false, loading: () => <ClockScreenSkeleton message="Opening clock…" /> },
);

function EmployeeClockInner() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [shops, setShops] = useState<Array<{ id: string; name: string }>>([]);
  const [shopId, setShopId] = useState(searchParams.get("shop_id") ?? "");
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const loadContext = useCallback(async () => {
    const qs = shopId ? `?shop_id=${encodeURIComponent(shopId)}` : "";
    const res = await fetch(`/api/employee/clock-context${qs}`, { credentials: "include" });
    if (!res.ok) return;
    const j = (await res.json()) as {
      assigned_shops?: Array<{ id: string; name: string }>;
      selected_shop_id?: string | null;
      can_clock?: boolean;
      block_message?: string | null;
      resolution?: string;
    };
    setShops(j.assigned_shops ?? []);
    if (j.block_message === "no_shop_assigned") {
      setBlocked(true);
      setReady(true);
      return;
    }
    if (!shopId && j.selected_shop_id) {
      setShopId(j.selected_shop_id);
    } else if (j.resolution === "pick_shop" && !shopId) {
      setReady(true);
      return;
    }
    setReady(true);
  }, [shopId]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  if (blocked) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {t("employee.dashboard.noShopAssigned")}
      </p>
    );
  }

  if (!ready) {
    return <ClockScreenSkeleton message={t("employee.dashboard.loading")} />;
  }

  if (!shopId || !isValidShopId(shopId)) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">{t("employee.clock.title")}</h1>
        <label className="block text-sm">
          {t("employee.clock.selectShop")}
          <select
            className="mt-1 w-full rounded border px-2 py-1.5"
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
          >
            <option value="">—</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!shopId}
          onClick={() => router.push(`/employee/clock?shop_id=${encodeURIComponent(shopId)}`)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t("employee.clock.continue")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h1 className="text-lg font-semibold">{t("employee.clock.title")}</h1>
      <ClockScreen shopId={shopId} punchQrToken={null} employeePortalMode />
    </div>
  );
}

export default function EmployeeClockPage() {
  return (
    <EmployeeSessionGate>
      <Suspense fallback={<ClockScreenSkeleton message="Loading…" />}>
        <EmployeeClockInner />
      </Suspense>
    </EmployeeSessionGate>
  );
}

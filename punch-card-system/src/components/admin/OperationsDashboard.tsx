"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/LanguageProvider";
import {
  OperationsScoreDrillDownHost,
  useOperationsScoreDrillDown,
} from "@/components/admin/operations/OperationsScoreDrillDown";
import type {
  EmployeeRankingRow,
  OutletRankingRow,
  PerformanceAnalyticsPayload,
  PerformancePeriod,
  ScoreComparison,
} from "@/lib/performance-analytics";

const PERIODS: PerformancePeriod[] = ["month", "week", "day"];

function formatDelta(delta: number | null): string {
  if (delta == null) return "—";
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

function deltaTone(delta: number | null): string {
  if (delta == null) return "text-[#64748B]";
  if (delta > 0) return "text-emerald-700";
  if (delta < 0) return "text-red-600";
  return "text-[#64748B]";
}

function ScoreCard({
  label,
  description,
  comparison,
  loading,
}: {
  label: string;
  description: string;
  comparison: ScoreComparison | null;
  loading?: boolean;
}) {
  const current = comparison?.current ?? null;
  const previous = comparison?.previous ?? null;
  const delta = comparison?.delta ?? null;

  return (
    <div className="flex flex-col rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-[#0F172A]">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-[#64748B]">{description}</p>
      {loading ? (
        <div className="mt-4 h-10 w-20 animate-pulse rounded-lg bg-zinc-100" />
      ) : (
        <>
          <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight text-[#0F172A]">
            {current ?? "—"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="text-[#64748B]">
              Prev: <span className="font-semibold text-[#0F172A]">{previous ?? "—"}</span>
            </span>
            <span className={`font-semibold ${deltaTone(delta)}`}>
              {formatDelta(delta)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function RankingSkeleton({ title }: { title: string }) {
  return (
    <section className="animate-pulse rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-[#0F172A]">{title}</p>
      <div className="mt-4 space-y-2">
        <div className="h-11 rounded-xl bg-zinc-100" />
        <div className="h-11 rounded-xl bg-zinc-100" />
        <div className="h-11 rounded-xl bg-zinc-100" />
      </div>
    </section>
  );
}

export function OperationsDashboard() {
  const { t } = useI18n();
  const drillDown = useOperationsScoreDrillDown();
  const [period, setPeriod] = useState<PerformancePeriod>("month");
  const [data, setData] = useState<PerformanceAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/performance-analytics?period=${period}`, {
        credentials: "include",
      });
      const json = (await res.json()) as PerformanceAnalyticsPayload & {
        error?: string;
        redirect?: string;
      };
      if (res.status === 402 && json.redirect) {
        window.location.href = json.redirect;
        return;
      }
      if (!res.ok) throw new Error(json.error || t("dashboard.operations.loadError"));
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dashboard.operations.loadError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const periodLabel = (p: PerformancePeriod) => {
    const key = `dashboard.operations.performance.period.${p}`;
    const label = t(key);
    return label === key ? p : label;
  };

  return (
    <div className="space-y-6">
      <OperationsScoreDrillDownHost target={drillDown.target} onClose={drillDown.close} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#64748B]">
            {loading ? t("dashboard.operations.loading") : data?.period_label}
          </p>
          {data && !loading ? (
            <p className="text-[11px] text-[#94A3B8]">
              {t("dashboard.operations.performance.vsPrevious")}: {data.previous_period_label}
            </p>
          ) : null}
        </div>
        <div className="inline-flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1 shadow-sm">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:py-2 ${
                period === p
                  ? "bg-white text-[#0F172A] shadow-sm"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {periodLabel(p)}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            {t("button.refresh")}
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ScoreCard
          label={t("dashboard.operations.performance.reliability")}
          description={t("dashboard.operations.performance.reliabilityDesc")}
          comparison={data?.scores.reliability ?? null}
          loading={loading}
        />
        <ScoreCard
          label={t("dashboard.operations.performance.taskScore")}
          description={t("dashboard.operations.performance.taskScoreDesc")}
          comparison={data?.scores.task ?? null}
          loading={loading}
        />
        <ScoreCard
          label={t("dashboard.operations.performance.compliance")}
          description={t("dashboard.operations.performance.complianceDesc")}
          comparison={data?.scores.compliance ?? null}
          loading={loading}
        />
        <ScoreCard
          label={t("dashboard.operations.performance.attendanceHealth")}
          description={t("dashboard.operations.performance.attendanceHealthDesc")}
          comparison={data?.scores.attendance_health ?? null}
          loading={loading}
        />
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <RankingSkeleton title={t("dashboard.operations.performance.outletRanking")} />
          <RankingSkeleton title={t("dashboard.operations.performance.employeeRanking")} />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <OutletRanking
            rows={data?.outlet_ranking ?? []}
            onSelect={(row) =>
              drillDown.openShop(row.shop_id, row.shop_name, t("drilldown.tapForDetails"))
            }
            emptyLabel={t("dashboard.operations.noShops")}
            title={t("dashboard.operations.performance.outletRanking")}
            scoreLabel={t("dashboard.operations.healthScore")}
            deltaLabel={t("dashboard.operations.performance.change")}
          />
          <EmployeeRanking
            rows={data?.employee_ranking ?? []}
            onSelect={(row) =>
              drillDown.openStaff(
                row.staff_id,
                row.staff_name,
                row.shop_label,
                row.reliability_score,
              )
            }
            emptyLabel={t("dashboard.operations.noReliableStaff")}
            title={t("dashboard.operations.performance.employeeRanking")}
            scoreLabel={t("dashboard.operations.reliability")}
            deltaLabel={t("dashboard.operations.performance.change")}
          />
        </div>
      )}

      <p className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-xs text-[#94A3B8]">
        {t("dashboard.operations.scoreDisclaimer")}
      </p>
    </div>
  );
}

function OutletRanking({
  title,
  rows,
  onSelect,
  emptyLabel,
  scoreLabel,
  deltaLabel,
}: {
  title: string;
  rows: OutletRankingRow[];
  onSelect: (row: OutletRankingRow) => void;
  emptyLabel: string;
  scoreLabel: string;
  deltaLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-[#0F172A]">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-[#64748B]">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.shop_id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/60 px-3 py-2.5 text-left transition hover:border-[#2563EB]/30 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                onClick={() => onSelect(row)}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-[#64748B]">
                  {row.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#0F172A]">{row.shop_name}</p>
                  <p className="text-[11px] text-[#64748B]">
                    {scoreLabel}: {row.score}
                    {row.previous_score != null ? ` · Prev ${row.previous_score}` : ""}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-semibold ${deltaTone(row.delta)}`}>
                  {deltaLabel} {formatDelta(row.delta)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EmployeeRanking({
  title,
  rows,
  onSelect,
  emptyLabel,
  scoreLabel,
  deltaLabel,
}: {
  title: string;
  rows: EmployeeRankingRow[];
  onSelect: (row: EmployeeRankingRow) => void;
  emptyLabel: string;
  scoreLabel: string;
  deltaLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-[#0F172A]">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-[#64748B]">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.staff_id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/60 px-3 py-2.5 text-left transition hover:border-[#2563EB]/30 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                onClick={() => onSelect(row)}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                  {row.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#0F172A]">{row.staff_name}</p>
                  <p className="truncate text-[11px] text-[#64748B]">
                    {row.shop_label} · {scoreLabel} {row.reliability_score}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-semibold ${deltaTone(row.delta)}`}>
                  {deltaLabel} {formatDelta(row.delta)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

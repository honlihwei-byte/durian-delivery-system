"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/LanguageProvider";
import {
  OperationsScoreDrillDownHost,
  useOperationsScoreDrillDown,
} from "@/components/admin/operations/OperationsScoreDrillDown";
import type { HealthReasonKey, HealthStatusBand } from "@/lib/operations-dashboard";

type HealthReason = { key: HealthReasonKey; count: number };

type OpsPayload = {
  date: string;
  summary: {
    average_shop_health: number | null;
    today_risks_total: number;
    staff_needing_attention: number;
    most_improved_shop_name: string | null;
  };
  risks: {
    late_count: number;
    missing_clock_out_count: number;
    gps_issues_count: number;
    review_required_count: number;
    overdue_tasks_count: number;
    task_exceptions_count: number;
  };
  shops: Array<{
    shop_id: string;
    shop_name: string;
    present_count: number;
    scheduled_count: number;
    health_score: number;
    status: HealthStatusBand;
    reasons: HealthReason[];
    task_count_today: number;
  }>;
  staff_attention?: never;
  staff_needs_attention: Array<{
    staff_id: string;
    staff_name: string;
    shop_label: string;
    reliability_score: number | null;
    today_reasons: string[];
  }>;
  staff_reliable: Array<{
    staff_id: string;
    staff_name: string;
    shop_label: string;
    reliability_score: number | null;
    score_available: boolean;
  }>;
  most_improved: {
    has_enough_data: boolean;
    shops: Array<{
      shop_id: string;
      shop_name: string;
      current_avg: number;
      previous_avg: number;
      improvement: number;
    }>;
  };
  workload: {
    performing_well: Array<{
      shop_id: string;
      shop_name: string;
      health_score: number;
      task_count_today: number;
      scheduled_count: number;
      exception_count: number;
    }>;
    needs_support: Array<{
      shop_id: string;
      shop_name: string;
      health_score: number;
      task_count_today: number;
      scheduled_count: number;
      exception_count: number;
    }>;
  };
  warnings?: Array<{
    widget: string;
    message: string;
    missing_column?: string;
    failed_query?: string;
  }>;
};

const STATUS_CLASS: Record<HealthStatusBand, string> = {
  excellent: "bg-emerald-50 text-emerald-800 border-emerald-200",
  good: "bg-blue-50 text-blue-900 border-blue-200",
  needs_attention: "bg-amber-50 text-amber-900 border-amber-200",
  critical: "bg-red-50 text-red-900 border-red-200",
};

const RISK_LINKS: Record<string, { href: string; issue?: string }> = {
  late: { href: "/admin/attendance" },
  missingOut: { href: "/admin/attendance", issue: "missing_clock_out" },
  location: { href: "/admin/attendance", issue: "rejected_gps" },
  review: { href: "/admin/risk-review" },
  overdueTasks: { href: "/admin/tasks" },
  taskExceptions: { href: "/admin/tasks" },
};

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "risk" | "good";
}) {
  const toneClass =
    tone === "risk"
      ? "border-amber-200 bg-amber-50"
      : tone === "good"
        ? "border-emerald-200 bg-emerald-50"
        : "border-[#E2E8F0] bg-white";
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-medium text-[#64748B]">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-[#0F172A]">{value}</p>
    </div>
  );
}

const DRILLDOWN_CARD =
  "w-full cursor-pointer text-left transition hover:brightness-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500";

export function OperationsDashboard() {
  const { t } = useI18n();
  const drillDown = useOperationsScoreDrillDown();
  const [data, setData] = useState<OpsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/operations-dashboard", { credentials: "include" });
      const j = (await res.json()) as OpsPayload & { error?: string; redirect?: string };
      if (res.status === 402 && j.redirect) {
        window.location.href = j.redirect;
        return;
      }
      if (!res.ok && !j.summary) throw new Error(j.error || t("dashboard.operations.loadError"));
      setData(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dashboard.operations.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatHealthReason = useCallback(
    (reason: HealthReason) => {
      const base = `dashboard.operations.healthReason.${reason.key}`;
      const key = reason.count === 1 ? base : `${base}_plural`;
      return t(key).replace("{count}", String(reason.count));
    },
    [t],
  );

  const widgetLabel = useCallback(
    (widget: string) => {
      const key = `dashboard.operations.widget.${widget}`;
      const label = t(key);
      return label === key ? widget : label;
    },
    [t],
  );

  const reasonLabel = useCallback(
    (reason: string) => {
      const map: Record<string, string> = {
        late: t("dashboard.operations.reasonLate"),
        missing_clock_out: t("dashboard.operations.reasonMissingOut"),
        location: t("dashboard.operations.reasonLocation"),
        review: t("dashboard.operations.reasonReview"),
      };
      return map[reason] ?? reason;
    },
    [t],
  );

  const riskItems = useMemo(() => {
    if (!data) return [];
    const r = data.risks;
    return [
      { key: "late", count: r.late_count, label: t("dashboard.operations.risks.late") },
      {
        key: "missingOut",
        count: r.missing_clock_out_count,
        label: t("dashboard.operations.risks.missingOut"),
      },
      {
        key: "location",
        count: r.gps_issues_count,
        label: t("dashboard.operations.risks.location"),
      },
      {
        key: "review",
        count: r.review_required_count,
        label: t("dashboard.operations.risks.review"),
      },
      {
        key: "overdueTasks",
        count: r.overdue_tasks_count,
        label: t("dashboard.operations.risks.overdueTasks"),
      },
      {
        key: "taskExceptions",
        count: r.task_exceptions_count,
        label: t("dashboard.operations.risks.taskExceptions"),
      },
    ].filter((item) => item.count > 0);
  }, [data, t]);

  const sortedShops = useMemo(() => {
    if (!data) return [];
    return [...data.shops].sort((a, b) => b.health_score - a.health_score);
  }, [data]);

  if (loading) {
    return <p className="text-sm text-[#64748B]">{t("dashboard.operations.loading")}</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <OperationsScoreDrillDownHost target={drillDown.target} onClose={drillDown.close} />
      {data.warnings && data.warnings.length > 0 ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-amber-950">
            {t("dashboard.operations.partialLoadTitle")}
          </h2>
          <p className="mt-1 text-xs text-amber-900">{t("dashboard.operations.partialLoadDesc")}</p>
          <ul className="mt-3 space-y-2">
            {data.warnings.map((w, i) => (
              <li key={`${w.widget}-${i}`} className="rounded-lg border border-amber-200 bg-white/80 px-3 py-2 text-xs text-amber-950">
                <p className="font-semibold">{widgetLabel(w.widget)}</p>
                {w.missing_column ? (
                  <p className="mt-0.5">
                    {t("dashboard.operations.missingColumn")}:{" "}
                    <code className="font-mono">{w.missing_column}</code>
                  </p>
                ) : null}
                <p className="mt-0.5 break-words opacity-80">{w.message}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-xs text-[#64748B]">
        {t("dashboard.operations.scoreDisclaimer")}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label={t("dashboard.operations.summary.avgHealth")}
          value={data.summary.average_shop_health ?? "—"}
          tone="good"
        />
        <SummaryCard
          label={t("dashboard.operations.summary.todayRisks")}
          value={data.summary.today_risks_total}
          tone={data.summary.today_risks_total > 0 ? "risk" : "default"}
        />
        <SummaryCard
          label={t("dashboard.operations.summary.staffAttention")}
          value={data.summary.staff_needing_attention}
          tone={data.summary.staff_needing_attention > 0 ? "risk" : "default"}
        />
        <SummaryCard
          label={t("dashboard.operations.summary.mostImproved")}
          value={data.summary.most_improved_shop_name ?? "—"}
        />
      </div>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-[#0F172A]">{t("dashboard.operations.todayRisks")}</h2>
        {riskItems.length === 0 ? (
          <p className="mt-2 text-sm text-[#64748B]">{t("dashboard.operations.noIssuesToday")}</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {riskItems.map((item) => {
              const link = RISK_LINKS[item.key];
              const href = link?.issue
                ? `${link.href}?issue_type=${encodeURIComponent(link.issue)}`
                : link?.href ?? "/admin/attendance";
              return (
                <Link
                  key={item.key}
                  href={href}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  <span>{item.label}</span>
                  <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px]">{item.count}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-[#0F172A]">
          {t("dashboard.operations.shopHealthRanking")}
        </h2>
        {sortedShops.length === 0 ? (
          <p className="mt-2 text-sm text-[#64748B]">{t("dashboard.operations.noShops")}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {sortedShops.map((shop) => (
              <button
                type="button"
                key={shop.shop_id}
                className={`${DRILLDOWN_CARD} rounded-xl border p-3 ${STATUS_CLASS[shop.status]}`}
                onClick={() =>
                  drillDown.openShop(
                    shop.shop_id,
                    shop.shop_name,
                    t("drilldown.tapForDetails"),
                  )
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{shop.shop_name}</p>
                    <p className="mt-0.5 text-[11px] opacity-80">
                      {t(`dashboard.operations.statusBand.${shop.status}`)}
                    </p>
                  </div>
                  <span className="rounded-lg bg-white/70 px-2 py-0.5 text-xs font-bold">
                    {t("dashboard.operations.healthScore")}: {shop.health_score}
                  </span>
                </div>
                {shop.reasons.length > 0 ? (
                  <div className="mt-2">
                    <p className="text-[11px] font-medium opacity-70">
                      {t("dashboard.operations.reasons")}:
                    </p>
                    <ul className="mt-1 list-inside list-disc text-[11px]">
                      {shop.reasons.map((r) => (
                        <li key={r.key}>{formatHealthReason(r)}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] opacity-70">{t("dashboard.operations.noIssuesToday")}</p>
                )}
                <p className="mt-2 text-[10px] font-medium underline opacity-60">
                  {t("drilldown.tapForDetails")}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0F172A]">
            {t("dashboard.operations.mostReliable")}
          </h2>
          {data.staff_reliable.length === 0 ? (
            <p className="mt-2 text-sm text-[#64748B]">{t("dashboard.operations.noReliableStaff")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.staff_reliable.map((row) => (
                <li key={row.staff_id}>
                  <button
                    type="button"
                    className={`${DRILLDOWN_CARD} flex w-full items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2 text-xs`}
                    onClick={() =>
                      drillDown.openStaff(
                        row.staff_id,
                        row.staff_name,
                        row.shop_label,
                        row.reliability_score,
                      )
                    }
                  >
                  <div>
                    <p className="font-semibold text-[#0F172A]">{row.staff_name}</p>
                    <p className="text-[#64748B]">{row.shop_label}</p>
                  </div>
                  <span className="rounded-lg bg-emerald-100 px-2 py-1 font-bold text-emerald-800">
                    {row.reliability_score ?? "—"}
                  </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0F172A]">
            {t("dashboard.operations.needsAttentionReliability")}
          </h2>
          {data.staff_needs_attention.length === 0 ? (
            <p className="mt-2 text-sm text-[#64748B]">{t("dashboard.operations.noStaffAttention")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.staff_needs_attention.map((row) => (
                <li key={row.staff_id}>
                  <button
                    type="button"
                    className={`${DRILLDOWN_CARD} w-full rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-xs`}
                    onClick={() =>
                      drillDown.openStaff(
                        row.staff_id,
                        row.staff_name,
                        row.shop_label,
                        row.reliability_score,
                      )
                    }
                  >
                  <p className="font-semibold text-[#0F172A]">
                    {row.staff_name}
                    <span className="ml-1 font-normal text-[#64748B]">· {row.shop_label}</span>
                  </p>
                  <p className="mt-1 text-[#64748B]">
                    {row.today_reasons.length > 0
                      ? row.today_reasons.map((r) => reasonLabel(r)).join(" · ")
                      : null}
                    {row.reliability_score != null ? (
                      <span>
                        {row.today_reasons.length > 0 ? " · " : ""}
                        {t("dashboard.operations.reliability")} {row.reliability_score}
                      </span>
                    ) : null}
                  </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-[#0F172A]">{t("dashboard.operations.mostImproved")}</h2>
        {!data.most_improved.has_enough_data ? (
          <div className="mt-2 text-sm text-[#64748B]">
            <p>{t("dashboard.operations.notEnoughData")}</p>
            <p className="mt-1">{t("dashboard.operations.continueUsingInsights")}</p>
          </div>
        ) : data.most_improved.shops.length === 0 ? (
          <p className="mt-2 text-sm text-[#64748B]">{t("dashboard.operations.noImprovedShops")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.most_improved.shops.map((shop) => (
              <li key={shop.shop_id}>
                <button
                  type="button"
                  className={`${DRILLDOWN_CARD} flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-2 text-xs`}
                  onClick={() =>
                    drillDown.openShop(shop.shop_id, shop.shop_name, t("drilldown.tapForDetails"))
                  }
                >
                <div>
                  <p className="font-semibold text-[#0F172A]">{shop.shop_name}</p>
                  <p className="text-[#64748B]">
                    {shop.previous_avg} → {shop.current_avg}
                  </p>
                </div>
                <span className="rounded-lg bg-blue-100 px-2 py-1 font-bold text-blue-800">
                  {t("dashboard.operations.improvedBy").replace("{points}", String(shop.improvement))}
                </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0F172A]">
            {t("dashboard.operations.hiddenPerformers")}
          </h2>
          {data.workload.performing_well.length === 0 ? (
            <p className="mt-2 text-sm text-[#64748B]">{t("dashboard.operations.noHiddenPerformers")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.workload.performing_well.map((shop) => (
                <li key={shop.shop_id}>
                  <button
                    type="button"
                    className={`${DRILLDOWN_CARD} w-full rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2 text-xs`}
                    onClick={() =>
                      drillDown.openShop(shop.shop_id, shop.shop_name, t("drilldown.tapForDetails"))
                    }
                  >
                  <p className="font-semibold text-[#0F172A]">{shop.shop_name}</p>
                  <p className="mt-1 text-[#64748B]">
                    {t("dashboard.operations.healthScore")}: {shop.health_score} ·{" "}
                    {t("dashboard.operations.tasksToday")}: {shop.task_count_today}
                  </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0F172A]">
            {t("dashboard.operations.shopsNeedingSupport")}
          </h2>
          {data.workload.needs_support.length === 0 ? (
            <p className="mt-2 text-sm text-[#64748B]">{t("dashboard.operations.noSupportShops")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.workload.needs_support.map((shop) => (
                <li key={shop.shop_id}>
                  <button
                    type="button"
                    className={`${DRILLDOWN_CARD} w-full rounded-lg border border-red-100 bg-red-50/40 px-3 py-2 text-xs`}
                    onClick={() =>
                      drillDown.openShop(shop.shop_id, shop.shop_name, t("drilldown.tapForDetails"))
                    }
                  >
                  <p className="font-semibold text-[#0F172A]">
                    {shop.shop_name}
                    <span className="ml-1 font-normal text-red-700">
                      · {t("dashboard.operations.workloadSupport")}
                    </span>
                  </p>
                  <p className="mt-1 text-[#64748B]">
                    {t("dashboard.operations.healthScore")}: {shop.health_score} ·{" "}
                    {t("dashboard.operations.tasksToday")}: {shop.task_count_today}
                  </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

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
  excellent: "border-emerald-200 bg-emerald-50/70",
  good: "border-blue-200 bg-blue-50/70",
  needs_attention: "border-amber-200 bg-amber-50/70",
  critical: "border-red-200 bg-red-50/70",
};

const STATUS_DOT: Record<HealthStatusBand, string> = {
  excellent: "bg-emerald-500",
  good: "bg-blue-500",
  needs_attention: "bg-amber-500",
  critical: "bg-red-500",
};

const RISK_LINKS: Record<string, { href: string; issue?: string }> = {
  late: { href: "/admin/attendance" },
  missingOut: { href: "/admin/attendance", issue: "missing_clock_out" },
  location: { href: "/admin/attendance", issue: "rejected_gps" },
  review: { href: "/admin/risk-review" },
  overdueTasks: { href: "/admin/tasks" },
  taskExceptions: { href: "/admin/tasks" },
};

type ScoreGrade = "excellent" | "good" | "fair" | "poor";

function scoreGrade(score: number): ScoreGrade {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

const GRADE_COLORS: Record<ScoreGrade, { ring: string; text: string; bg: string; label: string }> = {
  excellent: { ring: "#22C55E", text: "text-emerald-700", bg: "bg-emerald-50", label: "Excellent" },
  good: { ring: "#3B82F6", text: "text-blue-700", bg: "bg-blue-50", label: "Good" },
  fair: { ring: "#F59E0B", text: "text-amber-700", bg: "bg-amber-50", label: "Fair" },
  poor: { ring: "#EF4444", text: "text-red-700", bg: "bg-red-50", label: "Needs Work" },
};

function ScoreRing({
  score,
  loading,
}: {
  score: number | null;
  loading?: boolean;
}) {
  const size = 72;
  const strokeWidth = 6;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = score != null ? Math.min(100, Math.max(0, score)) / 100 : 0;
  const grade = score != null ? scoreGrade(score) : "poor";
  const { ring } = GRADE_COLORS[grade];

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
        {!loading && score != null ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ring}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            className="transition-all duration-700 ease-out"
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {loading ? (
          <div className="h-5 w-8 animate-pulse rounded bg-zinc-200" />
        ) : (
          <span className="text-lg font-bold tabular-nums text-[#0F172A]">
            {score != null ? score : "—"}
          </span>
        )}
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  score,
  description,
  loading,
  icon,
}: {
  label: string;
  score: number | null;
  description: string;
  loading?: boolean;
  icon: React.ReactNode;
}) {
  const grade = score != null ? scoreGrade(score) : "poor";
  const { text, bg, label: gradeLabel } = GRADE_COLORS[grade];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-[#64748B]">
            {icon}
          </div>
          <p className="mt-2 text-sm font-semibold text-[#0F172A]">{label}</p>
          <p className="mt-0.5 text-xs text-[#64748B] leading-relaxed">{description}</p>
        </div>
        <ScoreRing score={score} loading={loading} />
      </div>
      {!loading ? (
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${bg} ${text}`}>
            {gradeLabel}
          </span>
          {score != null ? (
            <div className="h-1.5 flex-1 ml-3 overflow-hidden rounded-full bg-[#F1F5F9]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${score}%`,
                  backgroundColor: GRADE_COLORS[grade].ring,
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ScoreCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-9 w-9 rounded-xl bg-zinc-100" />
          <div className="mt-2 h-4 w-28 rounded bg-zinc-200" />
          <div className="h-3 w-36 rounded bg-zinc-100" />
        </div>
        <div className="h-[72px] w-[72px] rounded-full bg-zinc-100" />
      </div>
    </div>
  );
}

function RiskBadge({ label, count, href }: { label: string; count: number; href: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 rounded-xl border border-[#FDE68A] bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-900 transition hover:border-amber-300 hover:bg-amber-100"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-900">
        {count}
      </span>
      <span>{label}</span>
      <svg className="ml-auto h-3 w-3 opacity-40 transition group-hover:opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold text-[#0F172A]">{title}</h2>
      {count != null ? (
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-[#64748B]">
          {count}
        </span>
      ) : null}
    </div>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <section className="animate-pulse rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="h-4 w-32 rounded bg-zinc-200" />
      <div className="mt-4 space-y-2.5">
        <div className="h-11 rounded-xl bg-zinc-100" />
        <div className="h-11 rounded-xl bg-zinc-100" />
        <div className="h-11 rounded-xl bg-zinc-100" />
      </div>
    </section>
  );
}

const DRILLDOWN_ROW =
  "w-full cursor-pointer text-left transition hover:brightness-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

export function OperationsDashboard() {
  const { t } = useI18n();
  const drillDown = useOperationsScoreDrillDown();
  const [data, setData] = useState<OpsPayload | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setSummaryLoading(true);
    setAnalyticsLoading(true);
    setSummaryError(null);
    setAnalyticsError(null);
    setData(null);

    try {
      const summaryRes = await fetch("/api/admin/operations-dashboard?view=summary", {
        credentials: "include",
      });
      const summaryJson = (await summaryRes.json()) as OpsPayload & {
        error?: string;
        redirect?: string;
      };
      if (summaryRes.status === 402 && summaryJson.redirect) {
        window.location.href = summaryJson.redirect;
        return;
      }
      if (!summaryRes.ok && !summaryJson.summary) {
        throw new Error(summaryJson.error || t("dashboard.operations.loadError"));
      }
      setData(summaryJson);
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : t("dashboard.operations.loadError"));
    } finally {
      setSummaryLoading(false);
    }

    const analyticsController = new AbortController();
    const analyticsTimeout = window.setTimeout(() => analyticsController.abort(), 20_000);
    try {
      const analyticsRes = await fetch("/api/admin/operations-dashboard?view=analytics", {
        credentials: "include",
        signal: analyticsController.signal,
      });
      const analyticsJson = (await analyticsRes.json()) as OpsPayload & { error?: string };
      if (!analyticsRes.ok && !analyticsJson.summary) {
        throw new Error(analyticsJson.error || t("dashboard.operations.loadError"));
      }
      setData((prev) => ({
        ...(prev ?? ({} as OpsPayload)),
        ...analyticsJson,
        risks: prev?.risks ?? analyticsJson.risks,
        shops: prev?.shops ?? analyticsJson.shops ?? [],
      }));
    } catch (e) {
      const message =
        e instanceof DOMException && e.name === "AbortError"
          ? t("dashboard.operations.loadError")
          : e instanceof Error
            ? e.message
            : t("dashboard.operations.loadError");
      setAnalyticsError(message);
    } finally {
      window.clearTimeout(analyticsTimeout);
      setAnalyticsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ── Derived scores (computed client-side from existing API data) ── */
  const scores = useMemo(() => {
    if (!data) return null;
    const r = data.risks;

    const attendanceHealth =
      data.summary.average_shop_health != null
        ? Math.round(data.summary.average_shop_health)
        : null;

    const staffWithScores = data.staff_reliable.filter(
      (s) => s.reliability_score != null,
    );
    const reliabilityScore =
      staffWithScores.length > 0
        ? Math.round(
            staffWithScores.reduce((sum, s) => sum + (s.reliability_score ?? 0), 0) /
              staffWithScores.length,
          )
        : null;

    const taskPenalty = r.overdue_tasks_count * 5 + r.task_exceptions_count * 3;
    const taskScore = Math.max(0, 100 - taskPenalty);

    const compliancePenalty = r.late_count * 3 + r.missing_clock_out_count * 5 + r.gps_issues_count * 4;
    const complianceScore = Math.max(0, 100 - compliancePenalty);

    return { attendanceHealth, reliabilityScore, taskScore, complianceScore };
  }, [data]);

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
      { key: "missingOut", count: r.missing_clock_out_count, label: t("dashboard.operations.risks.missingOut") },
      { key: "location", count: r.gps_issues_count, label: t("dashboard.operations.risks.location") },
      { key: "review", count: r.review_required_count, label: t("dashboard.operations.risks.review") },
      { key: "overdueTasks", count: r.overdue_tasks_count, label: t("dashboard.operations.risks.overdueTasks") },
      { key: "taskExceptions", count: r.task_exceptions_count, label: t("dashboard.operations.risks.taskExceptions") },
    ].filter((item) => item.count > 0);
  }, [data, t]);

  const sortedShops = useMemo(() => {
    if (!data) return [];
    return [...data.shops].sort((a, b) => b.health_score - a.health_score);
  }, [data]);

  if (summaryError && !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
        <p className="text-sm font-semibold text-red-700">{summaryError}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data && summaryLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ScoreCardSkeleton />
          <ScoreCardSkeleton />
          <ScoreCardSkeleton />
          <ScoreCardSkeleton />
        </div>
        <SectionSkeleton title={t("dashboard.operations.todayRisks")} />
        <SectionSkeleton title={t("dashboard.operations.shopHealthRanking")} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <OperationsScoreDrillDownHost target={drillDown.target} onClose={drillDown.close} />

      {/* Partial load warnings */}
      {data.warnings && data.warnings.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
          <p className="text-xs font-semibold text-amber-800">{t("dashboard.operations.partialLoadTitle")}</p>
          <p className="mt-0.5 text-xs text-amber-700">{t("dashboard.operations.partialLoadDesc")}</p>
          <ul className="mt-2 space-y-1.5">
            {data.warnings.map((w, i) => (
              <li key={`${w.widget}-${i}`} className="rounded-lg border border-amber-200 bg-white/70 px-3 py-1.5 text-xs text-amber-900">
                <span className="font-semibold">{widgetLabel(w.widget)}</span>
                {w.missing_column ? (
                  <> — Missing: <code className="font-mono">{w.missing_column}</code></>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {analyticsError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {analyticsError}
        </div>
      ) : null}

      {/* ── Score Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ScoreCard
          label="Attendance Health"
          score={scores?.attendanceHealth ?? null}
          description="Average shop health across all outlets today"
          loading={summaryLoading}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <ScoreCard
          label="Reliability Score"
          score={
            analyticsLoading
              ? null
              : (scores?.reliabilityScore ?? null)
          }
          description="Average staff reliability from the last 30 days"
          loading={analyticsLoading}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        <ScoreCard
          label="Task Score"
          score={
            analyticsLoading
              ? null
              : (scores?.taskScore ?? null)
          }
          description="Based on overdue tasks and task exceptions"
          loading={analyticsLoading}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          }
        />
        <ScoreCard
          label="Compliance Score"
          score={
            analyticsLoading
              ? null
              : (scores?.complianceScore ?? null)
          }
          description="Based on late arrivals and missing clock-outs"
          loading={summaryLoading}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* ── Operations Overview: Needs Attention (risks) ── */}
      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
        <SectionHeader
          title="Needs Attention"
          count={riskItems.length > 0 ? riskItems.reduce((s, i) => s + i.count, 0) : undefined}
        />
        {riskItems.length === 0 ? (
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium text-emerald-800">{t("dashboard.operations.noIssuesToday")}</p>
          </div>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {riskItems.map((item) => {
              const link = RISK_LINKS[item.key];
              const href = link?.issue
                ? `${link.href}?issue_type=${encodeURIComponent(link.issue)}`
                : link?.href ?? "/admin/attendance";
              return (
                <RiskBadge key={item.key} label={item.label} count={item.count} href={href} />
              );
            })}
          </div>
        )}
      </section>

      {/* ── Outlet Health ── */}
      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
        <SectionHeader title="Outlet Health" count={sortedShops.length} />
        {sortedShops.length === 0 ? (
          <p className="mt-3 text-sm text-[#64748B]">{t("dashboard.operations.noShops")}</p>
        ) : (
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {sortedShops.map((shop) => (
              <button
                type="button"
                key={shop.shop_id}
                className={`group w-full cursor-pointer rounded-xl border p-3.5 text-left transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${STATUS_CLASS[shop.status]}`}
                onClick={() =>
                  drillDown.openShop(shop.shop_id, shop.shop_name, t("drilldown.tapForDetails"))
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[shop.status]}`} />
                    <p className="truncate text-sm font-semibold text-[#0F172A]">{shop.shop_name}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-white/80 px-2 py-0.5 text-xs font-bold text-[#0F172A] shadow-sm">
                    {shop.health_score}
                  </span>
                </div>
                <p className="mt-1.5 pl-[18px] text-xs text-[#64748B]">
                  {t(`dashboard.operations.statusBand.${shop.status}`)}
                  {shop.reasons.length > 0 ? (
                    <> · {shop.reasons.slice(0, 2).map((r) => formatHealthReason(r)).join(", ")}</>
                  ) : null}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Staff: Needs Attention (reliability) + Most Reliable ── */}
      {analyticsLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionSkeleton title="Needs Attention" />
          <SectionSkeleton title={t("dashboard.operations.mostReliable")} />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <SectionHeader title={t("dashboard.operations.needsAttentionReliability")} count={data.staff_needs_attention.length || undefined} />
            {data.staff_needs_attention.length === 0 ? (
              <p className="mt-3 text-sm text-[#64748B]">{t("dashboard.operations.noStaffAttention")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.staff_needs_attention.map((row) => (
                  <li key={row.staff_id}>
                    <button
                      type="button"
                      className={`${DRILLDOWN_ROW} flex w-full items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5`}
                      onClick={() =>
                        drillDown.openStaff(row.staff_id, row.staff_name, row.shop_label, row.reliability_score)
                      }
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
                        {row.staff_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[#0F172A]">{row.staff_name}</p>
                        <p className="truncate text-[11px] text-[#64748B]">
                          {row.shop_label}
                          {row.today_reasons.length > 0
                            ? ` · ${row.today_reasons.map((r) => reasonLabel(r)).join(", ")}`
                            : null}
                        </p>
                      </div>
                      {row.reliability_score != null ? (
                        <span className="shrink-0 rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                          {row.reliability_score}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <SectionHeader title={t("dashboard.operations.mostReliable")} />
            {data.staff_reliable.length === 0 ? (
              <p className="mt-3 text-sm text-[#64748B]">{t("dashboard.operations.noReliableStaff")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.staff_reliable.map((row) => (
                  <li key={row.staff_id}>
                    <button
                      type="button"
                      className={`${DRILLDOWN_ROW} flex w-full items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5`}
                      onClick={() =>
                        drillDown.openStaff(row.staff_id, row.staff_name, row.shop_label, row.reliability_score)
                      }
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                        {row.staff_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[#0F172A]">{row.staff_name}</p>
                        <p className="truncate text-[11px] text-[#64748B]">{row.shop_label}</p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                        {row.reliability_score ?? "—"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ── Most Improved + Workload ── */}
      {analyticsLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionSkeleton title={t("dashboard.operations.mostImproved")} />
          <SectionSkeleton title={t("dashboard.operations.hiddenPerformers")} />
          <SectionSkeleton title={t("dashboard.operations.shopsNeedingSupport")} />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <SectionHeader title={t("dashboard.operations.mostImproved")} />
            {!data.most_improved.has_enough_data ? (
              <p className="mt-3 text-xs text-[#64748B]">{t("dashboard.operations.notEnoughData")}</p>
            ) : data.most_improved.shops.length === 0 ? (
              <p className="mt-3 text-xs text-[#64748B]">{t("dashboard.operations.noImprovedShops")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.most_improved.shops.map((shop) => (
                  <li key={shop.shop_id}>
                    <button
                      type="button"
                      className={`${DRILLDOWN_ROW} flex w-full items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2.5 text-xs`}
                      onClick={() => drillDown.openShop(shop.shop_id, shop.shop_name, t("drilldown.tapForDetails"))}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#0F172A]">{shop.shop_name}</p>
                        <p className="text-[#64748B]">{shop.previous_avg} → {shop.current_avg}</p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-blue-100 px-2 py-1 font-bold text-blue-800">
                        +{shop.improvement}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <SectionHeader title={t("dashboard.operations.hiddenPerformers")} />
            {data.workload.performing_well.length === 0 ? (
              <p className="mt-3 text-xs text-[#64748B]">{t("dashboard.operations.noHiddenPerformers")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.workload.performing_well.map((shop) => (
                  <li key={shop.shop_id}>
                    <button
                      type="button"
                      className={`${DRILLDOWN_ROW} w-full rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2.5 text-xs`}
                      onClick={() => drillDown.openShop(shop.shop_id, shop.shop_name, t("drilldown.tapForDetails"))}
                    >
                      <p className="font-semibold text-[#0F172A]">{shop.shop_name}</p>
                      <p className="mt-0.5 text-[#64748B]">
                        {t("dashboard.operations.healthScore")}: {shop.health_score} · {t("dashboard.operations.tasksToday")}: {shop.task_count_today}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <SectionHeader title={t("dashboard.operations.shopsNeedingSupport")} />
            {data.workload.needs_support.length === 0 ? (
              <p className="mt-3 text-xs text-[#64748B]">{t("dashboard.operations.noSupportShops")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.workload.needs_support.map((shop) => (
                  <li key={shop.shop_id}>
                    <button
                      type="button"
                      className={`${DRILLDOWN_ROW} w-full rounded-xl border border-red-100 bg-red-50/50 px-3 py-2.5 text-xs`}
                      onClick={() => drillDown.openShop(shop.shop_id, shop.shop_name, t("drilldown.tapForDetails"))}
                    >
                      <p className="font-semibold text-[#0F172A]">
                        {shop.shop_name}
                        <span className="ml-1.5 font-normal text-red-600">· {t("dashboard.operations.workloadSupport")}</span>
                      </p>
                      <p className="mt-0.5 text-[#64748B]">
                        {t("dashboard.operations.healthScore")}: {shop.health_score} · {t("dashboard.operations.tasksToday")}: {shop.task_count_today}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* Disclaimer */}
      <p className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-xs text-[#94A3B8]">
        {t("dashboard.operations.scoreDisclaimer")}
      </p>
    </div>
  );
}

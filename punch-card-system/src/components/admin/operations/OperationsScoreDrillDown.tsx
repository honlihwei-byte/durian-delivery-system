"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/LanguageProvider";
import type { ShopScoreDrillDown, StaffScoreDrillDown } from "@/lib/score-drilldown";
import {
  FactorGrid,
  IncidentTimeline,
  ScoreDeltaList,
  ScoreDrillDownDrawer,
  ScoreGrid,
} from "./ScoreDrillDownDrawer";

type DrillDownTarget =
  | { type: "staff"; staffId: string; title: string; subtitle?: string }
  | { type: "shop"; shopId: string; title: string; subtitle?: string }
  | null;

export function useOperationsScoreDrillDown() {
  const [target, setTarget] = useState<DrillDownTarget>(null);
  const openStaff = useCallback((staffId: string, title: string, subtitle?: string) => {
    setTarget({ type: "staff", staffId, title, subtitle });
  }, []);
  const openShop = useCallback((shopId: string, title: string, subtitle?: string) => {
    setTarget({ type: "shop", shopId, title, subtitle });
  }, []);
  const close = useCallback(() => setTarget(null), []);
  return { target, openStaff, openShop, close };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
      {children}
    </section>
  );
}

function StaffPanel({ data }: { data: StaffScoreDrillDown }) {
  const { t } = useI18n();

  const deltaLabel = useCallback(
    (key: string, count: number) => {
      const base = `drilldown.delta.${key}`;
      const text = t(base);
      return text.includes("{count}") ? text.replace("{count}", String(count)) : text;
    },
    [t],
  );

  const incidentLabel = useCallback((key: string) => t(key), [t]);

  const factorLabel = useCallback(
    (key: string, count: number) => {
      const base = `drilldown.factor.${key}`;
      const text = t(base);
      return text.includes("{count}") ? text.replace("{count}", String(count)) : text;
    },
    [t],
  );

  const factors = [
    { key: "late_punches", count: data.contributing_factors.late_punches },
    { key: "missing_punches", count: data.contributing_factors.missing_punches },
    { key: "gps_issues", count: data.contributing_factors.gps_issues },
    { key: "overdue_tasks", count: data.contributing_factors.overdue_tasks },
    { key: "rejected_tasks", count: data.contributing_factors.rejected_tasks },
    { key: "missing_photo_proof", count: data.contributing_factors.missing_photo_proof },
    { key: "review_required", count: data.contributing_factors.review_required },
    { key: "task_exceptions", count: data.contributing_factors.task_exceptions },
  ];

  return (
    <div className="space-y-5">
      <ScoreGrid
        items={[
          { label: t("drilldown.reliability"), value: data.reliability_score },
          { label: t("drilldown.attendance"), value: data.attendance_score },
          { label: t("drilldown.taskCompletion"), value: data.task_completion_score },
          { label: t("drilldown.gpsCompliance"), value: data.gps_compliance_score },
          { label: t("drilldown.photoCompliance"), value: data.photo_compliance_score },
        ]}
      />

      <Section title={t("drilldown.contributingFactors")}>
        <FactorGrid factors={factors} labelForKey={factorLabel} />
      </Section>

      <Section title={t("drilldown.whyScoreChanged")}>
        <ScoreDeltaList deltas={data.score_deltas} labelForKey={deltaLabel} />
      </Section>

      <Section title={t("drilldown.recentIncidents")}>
        <IncidentTimeline incidents={data.incidents} labelForKey={incidentLabel} />
      </Section>

      <Section title={t("drilldown.formula")}>
        <dl className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
          <div>
            <dt className="font-semibold text-zinc-800 dark:text-zinc-200">{t("drilldown.reliability")}</dt>
            <dd>{data.formula.reliability}</dd>
          </div>
          <div>
            <dt className="font-semibold text-zinc-800 dark:text-zinc-200">{t("drilldown.attendance")}</dt>
            <dd>{data.formula.attendance}</dd>
          </div>
        </dl>
      </Section>

      <p className="text-[11px] text-zinc-500">
        {t("drilldown.periodDays").replace("{days}", String(data.period_days))}
      </p>
    </div>
  );
}

function ShopPanel({ data }: { data: ShopScoreDrillDown }) {
  const { t } = useI18n();

  const deltaLabel = useCallback(
    (key: string, count: number) => {
      const base = `drilldown.delta.${key}`;
      const text = t(base);
      return text.includes("{count}") ? text.replace("{count}", String(count)) : text;
    },
    [t],
  );

  const incidentLabel = useCallback((key: string) => t(key), [t]);

  return (
    <div className="space-y-5">
      <ScoreGrid
        items={[
          { label: t("drilldown.health"), value: data.health_score },
          { label: t("drilldown.attendance"), value: data.attendance_score },
          { label: t("drilldown.taskScore"), value: data.task_score },
          { label: t("drilldown.gpsScore"), value: data.gps_score },
          { label: t("drilldown.compliance"), value: data.compliance_score },
        ]}
      />

      <Section title={t("drilldown.highlights")}>
        <div className="space-y-2 text-sm">
          {data.best_performer ? (
            <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/30">
              <span className="font-semibold">{t("drilldown.shop.best_performer")}: </span>
              {data.best_performer.staff_name} ({data.best_performer.score})
            </p>
          ) : null}
          {data.most_improved ? (
            <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 dark:border-blue-900 dark:bg-blue-950/30">
              <span className="font-semibold">{t("drilldown.shop.most_improved")}: </span>
              {data.most_improved.staff_name} (+{data.most_improved.delta})
            </p>
          ) : null}
          {data.needs_attention.length > 0 ? (
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="font-semibold">{t("drilldown.shop.needs_attention")}</p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {data.needs_attention.map((s) => (
                  <li key={s.staff_id}>
                    {s.staff_name} ({s.score})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Section>

      <Section title={t("drilldown.incidentSummary")}>
        {data.incident_summary.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("dashboard.operations.noIssuesToday")}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data.incident_summary.map((item) => (
              <li key={item.type} className="flex justify-between gap-2">
                <span>{t(item.label_key)}</span>
                <span className="font-semibold tabular-nums">{item.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("drilldown.whyScoreChanged")}>
        <ScoreDeltaList deltas={data.score_deltas} labelForKey={deltaLabel} />
      </Section>

      <Section title={t("drilldown.recentIncidents")}>
        <IncidentTimeline incidents={data.incidents} labelForKey={incidentLabel} />
      </Section>

      <Section title={t("drilldown.formula")}>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">{data.formula.health}</p>
      </Section>
    </div>
  );
}

export function OperationsScoreDrillDownHost({
  target,
  onClose,
}: {
  target: DrillDownTarget;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffData, setStaffData] = useState<StaffScoreDrillDown | null>(null);
  const [shopData, setShopData] = useState<ShopScoreDrillDown | null>(null);

  useEffect(() => {
    if (!target) {
      setStaffData(null);
      setShopData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setStaffData(null);
    setShopData(null);

    const url =
      target.type === "staff"
        ? `/api/admin/operations-dashboard/staff/${encodeURIComponent(target.staffId)}`
        : `/api/admin/operations-dashboard/shops/${encodeURIComponent(target.shopId)}`;

    void fetch(url, { credentials: "include" })
      .then(async (res) => {
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || t("drilldown.loadError"));
        return j;
      })
      .then((j) => {
        if (cancelled) return;
        if (target.type === "staff") setStaffData(j as StaffScoreDrillDown);
        else setShopData(j as ShopScoreDrillDown);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t("drilldown.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [target, t]);

  return (
    <ScoreDrillDownDrawer
      open={Boolean(target)}
      title={target?.title ?? ""}
      subtitle={target?.subtitle}
      loading={loading}
      error={error}
      onClose={onClose}
    >
      {staffData ? <StaffPanel data={staffData} /> : null}
      {shopData ? <ShopPanel data={shopData} /> : null}
    </ScoreDrillDownDrawer>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/LanguageProvider";
import type { IssueBadgeType } from "@/lib/attendance-report";
import { translateIssueBadge } from "@/lib/i18n/attendance-ui";
import { displayAttendanceStatus } from "@/lib/i18n/display-values";

type OpsPayload = {
  date: string;
  risks: {
    late_count: number;
    missing_clock_out_count: number;
    gps_issues_count: number;
    review_required_count: number;
    photo_proof_pending_count: number;
    new_device_count: number;
  };
  shops: Array<{
    shop_id: string;
    shop_name: string;
    present_count: number;
    scheduled_count: number;
    late_count: number;
    missing_clock_out_count: number;
    gps_issues_count: number;
    review_required_count: number;
    health_score: number;
  }>;
  staff_attention: Array<{
    staff_id: string;
    staff_name: string;
    shop_label: string;
    reasons: string[];
    reliability_score: number | null;
  }>;
  staff_reliable: Array<{
    staff_id: string;
    staff_name: string;
    shop_label: string;
    reliability_score: number;
    tier: string;
  }>;
  live_attendance: Array<{
    staff_id: string;
    staff_name: string;
    shop_label: string;
    scheduled_shift: string | null;
    clock_in: string | null;
    clock_out: string | null;
    status: string;
    issue_badges: IssueBadgeType[];
    late_minutes: number;
  }>;
};

function healthTone(score: number): "good" | "watch" | "risk" {
  if (score >= 80) return "good";
  if (score >= 50) return "watch";
  return "risk";
}

const HEALTH_CLASS = {
  good: "bg-emerald-50 text-emerald-800 border-emerald-200",
  watch: "bg-amber-50 text-amber-900 border-amber-200",
  risk: "bg-red-50 text-red-900 border-red-200",
};

const RISK_LINKS: Record<string, { href: string; issue?: string }> = {
  late: { href: "/admin/attendance" },
  missingOut: { href: "/admin/attendance", issue: "missing_clock_out" },
  location: { href: "/admin/attendance", issue: "rejected_gps" },
  review: { href: "/admin/risk-review" },
  photoProof: { href: "/admin/photo-proof" },
  newDevice: { href: "/admin/security/device-control" },
};

export function OperationsDashboard() {
  const { t } = useI18n();
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
      if (!res.ok) throw new Error(j.error || t("dashboard.operations.loadError"));
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
        key: "photoProof",
        count: r.photo_proof_pending_count,
        label: t("dashboard.operations.risks.photoProof"),
      },
      { key: "newDevice", count: r.new_device_count, label: t("dashboard.operations.risks.newDevice") },
    ].filter((item) => item.count > 0);
  }, [data, t]);

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

  if (loading) {
    return <p className="text-sm text-[#64748B]">{t("dashboard.operations.loading")}</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
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
        <h2 className="text-sm font-semibold text-[#0F172A]">{t("dashboard.operations.storeStatus")}</h2>
        {data.shops.length === 0 ? (
          <p className="mt-2 text-sm text-[#64748B]">{t("dashboard.operations.noShops")}</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.shops.map((shop) => {
              const tone = healthTone(shop.health_score);
              return (
                <div
                  key={shop.shop_id}
                  className={`rounded-xl border p-3 ${HEALTH_CLASS[tone]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{shop.shop_name}</p>
                    <span className="rounded-lg bg-white/70 px-2 py-0.5 text-xs font-bold">
                      {t("dashboard.operations.healthScore")} {shop.health_score}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] opacity-80">{t(`dashboard.operations.healthTone.${tone}`)}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                    <div>
                      <dt className="opacity-70">{t("dashboard.operations.present")}</dt>
                      <dd className="font-semibold">{shop.present_count}</dd>
                    </div>
                    <div>
                      <dt className="opacity-70">{t("dashboard.operations.scheduled")}</dt>
                      <dd className="font-semibold">{shop.scheduled_count}</dd>
                    </div>
                    <div>
                      <dt className="opacity-70">{t("dashboard.operations.late")}</dt>
                      <dd className="font-semibold">{shop.late_count}</dd>
                    </div>
                    <div>
                      <dt className="opacity-70">{t("dashboard.operations.missingOut")}</dt>
                      <dd className="font-semibold">{shop.missing_clock_out_count}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0F172A]">
            {t("dashboard.operations.staffAttention")}
          </h2>
          {data.staff_attention.length === 0 ? (
            <p className="mt-2 text-sm text-[#64748B]">{t("dashboard.operations.noStaffAttention")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.staff_attention.map((row) => (
                <li
                  key={row.staff_id}
                  className="rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-xs"
                >
                  <p className="font-semibold text-[#0F172A]">
                    {row.staff_name}
                    <span className="ml-1 font-normal text-[#64748B]">· {row.shop_label}</span>
                  </p>
                  <p className="mt-1 text-[#64748B]">
                    {row.reasons.map((r) => reasonLabel(r)).join(" · ")}
                    {row.reliability_score != null ? (
                      <span className="ml-1">
                        · {t("dashboard.operations.reliability")} {row.reliability_score}
                      </span>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#0F172A]">
            {t("dashboard.operations.mostReliable")}
          </h2>
          {data.staff_reliable.length === 0 ? (
            <p className="mt-2 text-sm text-[#64748B]">{t("dashboard.operations.noReliableStaff")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.staff_reliable.map((row) => (
                <li
                  key={row.staff_id}
                  className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-semibold text-[#0F172A]">{row.staff_name}</p>
                    <p className="text-[#64748B]">{row.shop_label}</p>
                  </div>
                  <span className="rounded-lg bg-emerald-100 px-2 py-1 font-bold text-emerald-800">
                    {row.reliability_score}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-[#0F172A]">{t("dashboard.operations.liveToday")}</h2>
        {data.live_attendance.length === 0 ? (
          <p className="mt-2 text-sm text-[#64748B]">{t("dashboard.operations.noLiveAttendance")}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-[640px] w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                  <th className="py-2 pr-2 font-medium">{t("dashboard.operations.staff")}</th>
                  <th className="py-2 pr-2 font-medium">{t("dashboard.operations.shop")}</th>
                  <th className="py-2 pr-2 font-medium">{t("dashboard.operations.shift")}</th>
                  <th className="py-2 pr-2 font-medium">{t("dashboard.operations.clockIn")}</th>
                  <th className="py-2 pr-2 font-medium">{t("dashboard.operations.clockOut")}</th>
                  <th className="py-2 pr-2 font-medium">{t("dashboard.operations.status")}</th>
                  <th className="py-2 font-medium">{t("dashboard.operations.issues")}</th>
                </tr>
              </thead>
              <tbody>
                {data.live_attendance.map((row) => (
                  <tr key={row.staff_id} className="border-b border-[#F1F5F9]">
                    <td className="py-2 pr-2 font-medium text-[#0F172A]">{row.staff_name}</td>
                    <td className="py-2 pr-2 text-[#64748B]">{row.shop_label}</td>
                    <td className="py-2 pr-2 font-mono text-[11px]">{row.scheduled_shift ?? "—"}</td>
                    <td className="py-2 pr-2 font-mono text-[11px]">{row.clock_in ?? "—"}</td>
                    <td className="py-2 pr-2 font-mono text-[11px]">{row.clock_out ?? "—"}</td>
                    <td className="py-2 pr-2">{displayAttendanceStatus(t, row.status)}</td>
                    <td className="py-2 text-[11px] text-[#64748B]">
                      {row.issue_badges.length > 0
                        ? row.issue_badges
                            .slice(0, 3)
                            .map((b) => translateIssueBadge(t, b))
                            .join(", ")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-[#0F172A]">
          {t("dashboard.operations.quickActions")}
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              { href: "/admin/attendance", label: t("dashboard.operations.actions.reviewIssues") },
              { href: "/admin/shift-schedule", label: t("dashboard.operations.actions.schedule") },
              { href: "/admin/shops", label: t("dashboard.operations.actions.shops") },
              { href: "/admin/staff", label: t("dashboard.operations.actions.staff") },
              { href: "/admin/security", label: t("dashboard.operations.actions.security") },
            ] as const
          ).map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#2563EB] shadow-sm hover:border-[#2563EB]/40"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

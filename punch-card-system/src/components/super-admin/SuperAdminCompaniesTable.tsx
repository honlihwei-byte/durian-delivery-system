"use client";

import { useCallback, useEffect, useState } from "react";
import { COMPANY_STATUS_LABELS, type CompanyStatus } from "@/lib/company";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";

type CompanyRow = {
  id: string;
  name: string;
  company_id: string;
  owner_name: string;
  phone: string;
  email: string;
  registered_at: string;
  trial_started_at: string;
  trial_ends_at: string | null;
  plan_slug: string;
  plan_name: string;
  subscription_ends_at: string | null;
  staff_count: number;
  shop_count: number;
  status: CompanyStatus;
  status_label: string;
  payment_status: string;
  payment_status_label: string;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

export function SuperAdminCompaniesTable() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/companies", { credentials: "include" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to load");
      setCompanies(j.companies ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(id: string, action: string, extra?: Record<string, unknown>) {
    setBusy(`${id}-${action}`);
    try {
      const res = await fetch("/api/super-admin/companies", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, ...extra }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Action failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading companies…</p>;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <p className="text-xs text-zinc-500">
        Platform view only — no attendance, staff records, GPS, or reports. Manage billing and
        subscription status here.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800">
        <table className="w-full min-w-[1200px] text-left text-xs">
          <thead className="bg-zinc-100 uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Company ID</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Registered</th>
              <th className="px-3 py-2">Trial start</th>
              <th className="px-3 py-2">Trial end</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Sub expires</th>
              <th className="px-3 py-2">Staff</th>
              <th className="px-3 py-2">Shops</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Payment</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2 font-mono">{c.company_id}</td>
                <td className="px-3 py-2">{c.owner_name}</td>
                <td className="px-3 py-2">{c.phone}</td>
                <td className="px-3 py-2">{c.email}</td>
                <td className="px-3 py-2">{fmtDate(c.registered_at)}</td>
                <td className="px-3 py-2">{fmtDate(c.trial_started_at)}</td>
                <td className="px-3 py-2">{fmtDate(c.trial_ends_at)}</td>
                <td className="px-3 py-2">{c.plan_name}</td>
                <td className="px-3 py-2">{fmtDate(c.subscription_ends_at)}</td>
                <td className="px-3 py-2">{c.staff_count}</td>
                <td className="px-3 py-2">{c.shop_count}</td>
                <td className="px-3 py-2">{c.status_label}</td>
                <td className="px-3 py-2">{c.payment_status_label}</td>
                <td className="px-3 py-2">
                  <div className="flex max-w-[220px] flex-col gap-1">
                    <button
                      type="button"
                      disabled={!!busy}
                      className="rounded border px-1 py-0.5 disabled:opacity-40"
                      onClick={() => void runAction(c.id, "activate")}
                    >
                      Activate
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      className="rounded border px-1 py-0.5 disabled:opacity-40"
                      onClick={() => void runAction(c.id, "suspend")}
                    >
                      Suspend
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      className="rounded border px-1 py-0.5 disabled:opacity-40"
                      onClick={() => void runAction(c.id, "extend_trial", { days: 14 })}
                    >
                      +14d trial
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      className="rounded border px-1 py-0.5 disabled:opacity-40"
                      onClick={() => void runAction(c.id, "extend_subscription", { days: 30 })}
                    >
                      +30d sub
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      className="rounded border px-1 py-0.5 disabled:opacity-40"
                      onClick={() => void runAction(c.id, "mark_paid")}
                    >
                      Mark paid
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      className="rounded border px-1 py-0.5 disabled:opacity-40"
                      onClick={() => void runAction(c.id, "mark_pending")}
                    >
                      Mark pending
                    </button>
                    <select
                      className="rounded border bg-white px-1 py-0.5 dark:bg-zinc-900"
                      defaultValue={c.plan_slug}
                      onChange={(e) => void runAction(c.id, "change_plan", { plan_slug: e.target.value })}
                    >
                      <option value="trial">Trial</option>
                      {SUBSCRIPTION_PLANS.map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded border bg-white px-1 py-0.5 dark:bg-zinc-900"
                      defaultValue={c.status}
                      onChange={(e) =>
                        void runAction(c.id, "set_status", { status: e.target.value })
                      }
                    >
                      {(["trial", "active", "expired", "suspended"] as CompanyStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {COMPANY_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

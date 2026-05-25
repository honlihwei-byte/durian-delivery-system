"use client";

import { useCallback, useEffect, useState } from "react";
import { COMPANY_STATUS_LABELS, type CompanyStatus } from "@/lib/company";

type CompanyRow = {
  id: string;
  name: string;
  code: string;
  status: CompanyStatus;
  status_label: string;
  shop_count: number;
  trial_ends_at: string | null;
};

const STATUS_BADGE: Record<CompanyStatus, string> = {
  trial: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100",
  active: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
  suspended: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100",
  expired: "bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-100",
};

export default function SuperAdminPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  async function setStatus(id: string, status: CompanyStatus) {
    const res = await fetch("/api/super-admin/companies", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, extend_subscription: status === "active" }),
    });
    if (!res.ok) {
      const j = await res.json();
      setError(j.error || "Update failed");
      return;
    }
    void load();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
          Platform
        </p>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Super Admin</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Manage companies and subscription status. Attendance, staff, and GPS details are only
          available to Company Admin dashboards.
        </p>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading companies…</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Shops</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                  <td className="px-4 py-3">{c.shop_count}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[c.status]}`}
                    >
                      {COMPANY_STATUS_LABELS[c.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      {(["trial", "active", "suspended", "expired"] as CompanyStatus[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={c.status === s}
                          onClick={() => void setStatus(c.id, s)}
                          className="rounded-lg border border-zinc-300 px-2 py-1 text-[10px] font-semibold disabled:opacity-40 dark:border-zinc-600"
                        >
                          {COMPANY_STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

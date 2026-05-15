"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import {
  clearCurrentSession,
  getCurrentSession,
  isAdminSession,
  loginAdminSession,
  loginDriverSession,
} from "@/lib/demo-session";
import { computeDriverLoginDefaults } from "@/lib/driver-login-helpers";
import { getDeliveryStoreSnapshot, listDemoCompanies } from "@/lib/delivery-demo-storage";
import type { CompanyRow, DeliveryStore } from "@/types/delivery";

type LoginRole = "admin" | "driver";

function roleCardClasses(active: boolean) {
  return active
    ? "border-drive-accent bg-drive-accent text-white"
    : "border-drive-line bg-white text-drive-ink hover:bg-drive-bg";
}

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRole = searchParams.get("role");
  const next = searchParams.get("next");

  const [role, setRole] = useState<LoginRole>(requestedRole === "admin" ? "admin" : "driver");
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [companyCode, setCompanyCode] = useState("MXFRUIT");
  const [store, setStore] = useState<DeliveryStore | null>(null);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);
  const [username, setUsername] = useState(requestedRole === "admin" ? "admin" : "");
  const [password, setPassword] = useState(requestedRole === "admin" ? "admin" : "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRole(requestedRole === "admin" ? "admin" : "driver");
  }, [requestedRole]);

  useEffect(() => {
    setCompanies(listDemoCompanies());
  }, []);

  const selectedCompany = useMemo(() => {
    const normalized = companyCode.trim().toUpperCase();
    return companies.find((c) => c.companyCode.toUpperCase() === normalized) ?? companies[0] ?? null;
  }, [companies, companyCode]);

  useEffect(() => {
    const companyId = selectedCompany?.companyId ?? null;

    const refreshStoreAndSessionBanner = () => {
      const activeSession = getCurrentSession();
      setStore(companyId ? getDeliveryStoreSnapshot(companyId) : null);
      setSessionSummary(
        activeSession
          ? `${activeSession.role === "admin" ? "Admin" : "Driver"} · ${activeSession.companyName} (${activeSession.companyCode}) · ${activeSession.name}`
          : null
      );
    };

    refreshStoreAndSessionBanner();
    window.addEventListener("storage", refreshStoreAndSessionBanner);
    return () => window.removeEventListener("storage", refreshStoreAndSessionBanner);
  }, [companies, selectedCompany]);

  /**
   * Sync demo credentials when company, role, or store snapshot changes.
   * Intentionally does NOT depend on `username` — otherwise every keystroke re-ran the old logic
   * and reset the field whenever the partial string did not yet match a driver (breaking renames).
   */
  useEffect(() => {
    if (role === "admin") {
      setUsername("admin");
      setPassword("admin");
      return;
    }

    if (!store?.drivers.length) {
      setUsername("");
      setPassword("");
      return;
    }

    let nextPassword = "";
    setUsername((prev) => {
      const next = computeDriverLoginDefaults(prev, store.drivers);
      nextPassword = next.password;
      return next.username;
    });
    setPassword(nextPassword);
  }, [role, store, selectedCompany?.companyId]);

  const driverAccounts = useMemo(() => store?.drivers ?? [], [store]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const code = companyCode.trim() || selectedCompany?.companyCode || "";
    const result =
      role === "admin"
        ? loginAdminSession(code, username, password)
        : loginDriverSession(code, username, password);

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const target = next ?? (isAdminSession(result.session) ? "/admin" : "/driver");
    router.replace(target);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-drive-bg">
      <SiteHeader title="Delivery Operations" subtitle="Demo sign-in · MX Fruit · ABC Frozen · Mini Mart Supplier" />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-drive-line bg-drive-surface p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-drive-accent">
              Presentation-ready demo
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-drive-ink">
              Sign in as operations or field crew
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-drive-muted">
              Pick a tenant, then open the admin console or driver app. All data stays in this browser — ideal for
              walkthroughs with prospects.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRole("driver")}
                className={`rounded-2xl border px-4 py-4 text-left transition ${roleCardClasses(
                  role === "driver"
                )}`}
              >
                <p className="text-sm font-semibold">Driver Login</p>
                <p className={`mt-1 text-xs ${role === "driver" ? "text-white/80" : "text-drive-muted"}`}>
                  For mobile check-in and assigned route updates
                </p>
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`rounded-2xl border px-4 py-4 text-left transition ${roleCardClasses(
                  role === "admin"
                )}`}
              >
                <p className="text-sm font-semibold">Admin Login</p>
                <p className={`mt-1 text-xs ${role === "admin" ? "text-white/80" : "text-drive-muted"}`}>
                  For account setup, route assignment, and progress monitoring
                </p>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-drive-ink">
                  Company
                </label>
                <select
                  id="company"
                  value={selectedCompany?.companyCode ?? companyCode}
                  onChange={(event) => setCompanyCode(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                >
                  {companies.map((company) => (
                    <option key={company.companyId} value={company.companyCode}>
                      {company.companyName} ({company.companyCode})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-drive-muted">
                  Codes: MXFRUIT · ABCFROZEN · MINIMART — seeded routes include TF Tambun, TF Falim, Hala Mini Market,
                  Soon Lee Grocer, Restoran XYZ.
                </p>
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-drive-ink">
                  Username
                </label>
                <input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-drive-ink">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-drive-line bg-white px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
                />
              </div>

              {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-drive-accent py-3 text-sm font-semibold text-white hover:bg-drive-accentMuted disabled:opacity-60"
              >
                {loading ? "Signing in..." : `Sign in as ${role === "admin" ? "Admin" : "Driver"}`}
              </button>
            </form>

            {sessionSummary ? (
              <div className="mt-4 rounded-xl border border-drive-line bg-drive-bg px-4 py-3 text-sm text-drive-ink">
                <p>{sessionSummary}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link href="/driver" className="font-medium text-drive-accent hover:underline">
                    Open driver page
                  </Link>
                  <Link href="/admin" className="font-medium text-drive-accent hover:underline">
                    Open admin dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      clearCurrentSession();
                      setSessionSummary(null);
                    }}
                    className="font-medium text-drive-ink underline decoration-drive-line"
                  >
                    Sign out current session
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-drive-line bg-drive-surface p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-drive-muted">
                Demo admin (per company)
              </p>
              <div className="mt-3 rounded-xl bg-drive-bg p-3 text-sm">
                <p className="font-medium text-drive-ink">Username: admin</p>
                <p className="mt-1 text-drive-muted">Password: admin</p>
                <p className="mt-2 text-xs text-drive-muted">All demo drivers use password: demo123</p>
              </div>
            </section>

            <section className="rounded-2xl border border-drive-line bg-drive-surface p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-drive-muted">
                Demo drivers ({selectedCompany?.companyName ?? "—"})
              </p>
              <div className="mt-3 space-y-3">
                {driverAccounts.length === 0 ? (
                  <p className="text-sm text-drive-muted">Loading company data…</p>
                ) : (
                  driverAccounts.map((driver) => (
                    <div key={driver.id} className="rounded-xl border border-drive-line bg-drive-bg p-3 text-sm">
                      <p className="font-medium text-drive-ink">
                        {driver.name}
                        {!driver.isActive ? (
                          <span className="ml-1 text-xs font-normal text-red-700">(inactive)</span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-drive-muted">
                        {driver.username} / {driver.password}
                      </p>
                      <p className="mt-1 text-xs text-drive-muted">
                        {driver.vehicle} · {driver.zone}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

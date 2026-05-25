"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { btnPrimary } from "@/components/marketing/MarketingShell";

type LoginMode = "legacy" | "new";

export function CompanyLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const [mode, setMode] = useState<LoginMode>("legacy");
  const [companyCode, setCompanyCode] = useState("DEFAULT");
  const [pin, setPin] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function redirectAfterLogin() {
    const dest =
      nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/admin";
    router.push(dest);
    router.refresh();
  }

  async function handleLegacySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          role: "company_admin",
          company_code: companyCode,
          pin,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Sign in failed");
        setPin("");
        return;
      }
      redirectAfterLogin();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleNewSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/company-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ company_id: companyId, password }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Sign in failed");
        return;
      }
      redirectAfterLogin();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Company Login</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {mode === "legacy"
            ? "Existing accounts: company code + 6-digit PIN."
            : "New accounts: Company ID (CMP-…) + password."}
        </p>
      </header>

      <div className="mt-6 flex rounded-xl border border-zinc-200 p-1 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => {
            setMode("legacy");
            setError(null);
          }}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
            mode === "legacy"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Existing (code + PIN)
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("new");
            setError(null);
          }}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
            mode === "new"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Company ID + password
        </button>
      </div>

      {mode === "legacy" ? (
        <form
          onSubmit={handleLegacySubmit}
          className="mt-6 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Company code
            <input
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
              placeholder="DEFAULT"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 font-mono uppercase dark:border-zinc-600 dark:bg-zinc-900"
              autoComplete="organization"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            PIN
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-4 text-center font-mono text-2xl tracking-[0.4em] dark:border-zinc-600 dark:bg-zinc-900"
              placeholder="••••••"
              autoComplete="off"
              required
            />
          </label>
          {error ? <p className="text-center text-sm font-medium text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading || pin.length !== 6}
            className={btnPrimary("w-full disabled:opacity-50")}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleNewSubmit}
          className="mt-6 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Company ID
            <input
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value.toUpperCase())}
              placeholder="CMP-XXXXXX"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 font-mono uppercase tracking-wider dark:border-zinc-600 dark:bg-zinc-900"
              autoComplete="username"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="text-center text-sm font-medium text-red-600">{error}</p> : null}
          <button type="submit" disabled={loading} className={btnPrimary("w-full disabled:opacity-50")}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        New company?{" "}
        <Link href="/register" className="font-semibold text-zinc-900 underline dark:text-zinc-100">
          Start free trial
        </Link>
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { btnPrimary } from "@/components/marketing/MarketingShell";

export function CompanyLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const verified = searchParams.get("verified") === "1";
  const authError = searchParams.get("error");
  const [companyId, setCompanyId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (verified) {
      setSuccess("Email verified successfully. You can now sign in.");
    } else if (authError === "verification_failed") {
      setError("Email verification failed or expired. Try resending from the verify page.");
    }
  }, [verified, authError]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
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
        if (j.redirect) {
          router.push(j.redirect);
          return;
        }
        setError(j.error || "Sign in failed");
        return;
      }
      const dest =
        j.redirect ||
        (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/admin");
      router.push(dest);
      router.refresh();
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
          Sign in with your Company ID and password.
        </p>
      </header>

      {success ? (
        <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {success}
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="mt-8 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Company ID
          <input
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value.toUpperCase())}
            placeholder="CMP-000001"
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
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm font-semibold text-zinc-700 underline dark:text-zinc-300"
          >
            Forgot password
          </Link>
        </div>
        {error ? <p className="text-center text-sm font-medium text-red-600">{error}</p> : null}
        <button type="submit" disabled={loading} className={btnPrimary("w-full disabled:opacity-50")}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        New company?{" "}
        <Link href="/register" className="font-semibold text-zinc-900 underline dark:text-zinc-100">
          Start free trial
        </Link>
      </p>
    </div>
  );
}

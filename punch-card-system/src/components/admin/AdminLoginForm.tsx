"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  defaultRedirect?: string;
  onSuccess?: () => void;
};

export function AdminLoginForm({ defaultRedirect = "/admin", onSuccess }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"company_admin" | "super_admin">("company_admin");
  const [companyCode, setCompanyCode] = useState("DEFAULT");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          role: mode,
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
      onSuccess?.();
      const dest = mode === "super_admin" ? "/super-admin" : defaultRedirect;
      router.push(dest);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-6 px-4 py-12">
      <header className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Admin sign in</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Company Admin for your business, or Super Admin for platform management.
        </p>
      </header>

      <div className="flex rounded-xl border border-zinc-200 p-1 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => setMode("company_admin")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
            mode === "company_admin"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Company Admin
        </button>
        <button
          type="button"
          onClick={() => setMode("super_admin")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
            mode === "super_admin"
              ? "bg-violet-700 text-white"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          Super Admin
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {mode === "company_admin" ? (
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Company code
            <input
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 font-mono uppercase dark:border-zinc-600 dark:bg-zinc-900"
              autoComplete="organization"
            />
          </label>
        ) : null}
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
          />
        </label>
        {error ? <p className="text-center text-sm font-medium text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading || pin.length !== 6}
          className="rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

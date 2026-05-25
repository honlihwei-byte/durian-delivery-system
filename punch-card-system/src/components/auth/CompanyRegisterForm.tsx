"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary } from "@/components/marketing/MarketingShell";

export function CompanyRegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    company_name: "",
    owner_name: "",
    phone: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdLoginId, setCreatedLoginId] = useState<string | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Registration failed");
        return;
      }
      setCreatedLoginId(j.company?.login_id ?? null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (createdLoginId) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-emerald-200 bg-emerald-50/90 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950/50">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">You&apos;re all set</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Save your Company Login ID. You will use it to sign in (not your email).
        </p>
        <p className="mt-6 font-mono text-2xl font-bold tracking-wider text-emerald-800 dark:text-emerald-200">
          {createdLoginId}
        </p>
        <p className="mt-4 text-xs text-zinc-500">14-day trial started · status: Trial</p>
        <button
          type="button"
          className={`${btnPrimary("mt-8 w-full")}`}
          onClick={() => router.push("/login")}
        >
          Go to Company Login
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Start free trial</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Register your company — 14 days free, full features.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mt-8 grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2"
      >
        <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2">
          Company name
          <input
            value={form.company_name}
            onChange={(e) => update("company_name", e.target.value)}
            className="rounded-xl border border-zinc-300 px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Owner name
          <input
            value={form.owner_name}
            onChange={(e) => update("owner_name", e.target.value)}
            className="rounded-xl border border-zinc-300 px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Phone number
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="rounded-xl border border-zinc-300 px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="rounded-xl border border-zinc-300 px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
            autoComplete="email"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="rounded-xl border border-zinc-300 px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
            autoComplete="new-password"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Confirm password
          <input
            type="password"
            value={form.confirm_password}
            onChange={(e) => update("confirm_password", e.target.value)}
            className="rounded-xl border border-zinc-300 px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
            autoComplete="new-password"
            required
          />
        </label>
        {error ? (
          <p className="text-center text-sm font-medium text-red-600 sm:col-span-2">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className={`${btnPrimary("sm:col-span-2 w-full disabled:opacity-50")}`}
        >
          {loading ? "Creating…" : "Create company"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Already registered?{" "}
        <Link href="/login" className="font-semibold underline">
          Company Login
        </Link>
      </p>
    </div>
  );
}

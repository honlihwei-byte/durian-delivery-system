"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary } from "@/components/marketing/MarketingShell";

const BUSINESS_TYPES = [
  "Retail",
  "F&B",
  "Services",
  "Warehouse",
  "Office",
  "Other",
];

const STAFF_ESTIMATES = ["1-10", "11-30", "31-100", "100+"];

export function CompanyRegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    company_name: "",
    owner_name: "",
    phone: "",
    email: "",
    password: "",
    confirm_password: "",
    business_type: "Retail",
    staff_estimate: "1-10",
    country: "MY",
    timezone: "Asia/Kuala_Lumpur",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<{ devOtp?: string; verifyUrl?: string } | null>(null);

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
      setPending({ devOtp: j.dev_otp, verifyUrl: j.verify_url });
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (pending) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-sky-200 bg-sky-50/90 p-8 dark:border-sky-900 dark:bg-sky-950/40">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Check your email</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          We sent a verification link to <strong>{form.email}</strong>. After verifying, you will
          receive your Company ID and 14-day trial starts.
        </p>
        {pending.devOtp ? (
          <p className="mt-4 rounded-lg bg-white p-3 text-sm dark:bg-zinc-900">
            Dev OTP: <span className="font-mono font-bold">{pending.devOtp}</span>
          </p>
        ) : null}
        <button
          type="button"
          className={`${btnPrimary("mt-6 w-full")}`}
          onClick={() => router.push(`/verify-email?email=${encodeURIComponent(form.email)}`)}
        >
          Enter verification code
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Start free trial</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Register your company — verify email, then get your Company ID.
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
            className="rounded-xl border px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Owner name
          <input
            value={form.owner_name}
            onChange={(e) => update("owner_name", e.target.value)}
            className="rounded-xl border px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Phone
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="rounded-xl border px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="rounded-xl border px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Business type
          <select
            value={form.business_type}
            onChange={(e) => update("business_type", e.target.value)}
            className="rounded-xl border px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
          >
            {BUSINESS_TYPES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Staff estimate
          <select
            value={form.staff_estimate}
            onChange={(e) => update("staff_estimate", e.target.value)}
            className="rounded-xl border px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
          >
            {STAFF_ESTIMATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Country
          <input
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
            className="rounded-xl border px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Timezone
          <input
            value={form.timezone}
            onChange={(e) => update("timezone", e.target.value)}
            className="rounded-xl border px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="rounded-xl border px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Confirm password
          <input
            type="password"
            value={form.confirm_password}
            onChange={(e) => update("confirm_password", e.target.value)}
            className="rounded-xl border px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
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
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
        Already registered?{" "}
        <Link href="/login" className="font-semibold underline">
          Company Login
        </Link>
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary } from "@/components/marketing/MarketingShell";
import { BrandLogo } from "@/components/brand/BrandLogo";

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
        if (j.pending && form.email) {
          router.push(`/verify-email?email=${encodeURIComponent(form.email)}`);
          return;
        }
        setError(j.error || "Registration failed");
        return;
      }
      const email = j.email || form.email;
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <header className="text-center">
        <div className="mb-6 flex justify-center">
          <BrandLogo size="login" />
        </div>
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

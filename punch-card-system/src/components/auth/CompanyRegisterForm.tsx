"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { btnPrimary } from "@/components/marketing/MarketingShell";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useI18n } from "@/components/i18n/LanguageProvider";
import {
  COUNTRY_DEFAULT_TIMEZONE,
  detectRegisterDefaults,
  REGISTER_BUSINESS_TYPES,
  REGISTER_COUNTRY_CODES,
  REGISTER_STAFF_ESTIMATES,
  REGISTER_TIMEZONE_OPTIONS,
  timezoneForCountry,
  type RegisterBusinessType,
  type RegisterCountryCode,
} from "@/lib/register-form-options";

type FormState = {
  company_name: string;
  owner_name: string;
  phone: string;
  email: string;
  password: string;
  confirm_password: string;
  business_type: RegisterBusinessType;
  staff_estimate: (typeof REGISTER_STAFF_ESTIMATES)[number];
  country: RegisterCountryCode;
  timezone: string;
};

const INITIAL_FORM: FormState = {
  company_name: "",
  owner_name: "",
  phone: "",
  email: "",
  password: "",
  confirm_password: "",
  business_type: "retail",
  staff_estimate: "1-10",
  country: "MY",
  timezone: COUNTRY_DEFAULT_TIMEZONE.MY,
};

export function CompanyRegisterForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { country, timezone } = detectRegisterDefaults();
    setForm((f) => ({ ...f, country, timezone }));
  }, []);

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleCountryChange(country: RegisterCountryCode) {
    setForm((f) => ({
      ...f,
      country,
      timezone: timezoneForCountry(country),
    }));
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

  const timezoneOptions = REGISTER_TIMEZONE_OPTIONS.includes(form.timezone)
    ? REGISTER_TIMEZONE_OPTIONS
    : [form.timezone, ...REGISTER_TIMEZONE_OPTIONS];

  return (
    <div className="mx-auto max-w-lg">
      <header className="text-center">
        <div className="mb-6 flex justify-center">
          <BrandLogo size="login" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t("register.title")}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t("register.subtitle")}</p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mt-8 grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2"
      >
        <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2">
          {t("register.companyName")}
          <input
            value={form.company_name}
            onChange={(e) => update("company_name", e.target.value)}
            className="rounded-xl border px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          {t("register.ownerName")}
          <input
            value={form.owner_name}
            onChange={(e) => update("owner_name", e.target.value)}
            className="rounded-xl border px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          {t("register.phone")}
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="rounded-xl border px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2">
          {t("register.email")}
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="rounded-xl border px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          {t("register.businessType")}
          <select
            value={form.business_type}
            onChange={(e) => update("business_type", e.target.value as RegisterBusinessType)}
            className="rounded-xl border px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
          >
            {REGISTER_BUSINESS_TYPES.map((value) => (
              <option key={value} value={value}>
                {t(`register.businessTypes.${value}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          {t("register.staffEstimate")}
          <select
            value={form.staff_estimate}
            onChange={(e) =>
              update("staff_estimate", e.target.value as FormState["staff_estimate"])
            }
            className="rounded-xl border px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
          >
            {REGISTER_STAFF_ESTIMATES.map((value) => (
              <option key={value} value={value}>
                {t(`register.staffEstimates.${value}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          {t("register.country")}
          <select
            value={form.country}
            onChange={(e) => handleCountryChange(e.target.value as RegisterCountryCode)}
            className="rounded-xl border px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
          >
            {REGISTER_COUNTRY_CODES.map((code) => (
              <option key={code} value={code}>
                {t(`register.countries.${code}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          {t("register.timezone")}
          <select
            value={form.timezone}
            onChange={(e) => update("timezone", e.target.value)}
            className="rounded-xl border px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
          >
            {timezoneOptions.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          {t("register.password")}
          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="rounded-xl border px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          {t("register.confirmPassword")}
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
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 sm:col-span-2">
          {t("register.trialHelper")}
        </p>
        <button
          type="submit"
          disabled={loading}
          className={`${btnPrimary("sm:col-span-2 w-full disabled:opacity-50")}`}
        >
          {loading ? t("register.creating") : t("register.createAccount")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
        {t("register.haveAccount")}{" "}
        <Link href="/login" className="font-semibold underline">
          {t("login.title")}
        </Link>
      </p>
    </div>
  );
}

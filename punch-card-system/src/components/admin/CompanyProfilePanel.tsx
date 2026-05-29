"use client";

import { useCallback, useEffect, useState } from "react";
import { btnPrimary } from "@/components/marketing/MarketingShell";
import { COMPANY_TIMEZONE_OPTIONS } from "@/lib/company-timezones";
import { PageGuide } from "@/components/help/PageGuide";

type CompanyProfile = {
  company_name: string;
  company_id: string;
  owner_name: string;
  email: string;
  phone: string;
  registration_date: string | null;
  email_verified: boolean;
  email_verified_at: string | null;
  current_plan: string;
  payment_status: string;
  trial_start: string | null;
  trial_end: string | null;
  subscription_expiry: string | null;
  staff_count: number;
  staff_limit: number | null;
  shop_count: number;
  shop_limit: number | null;
  account_status: string;
  timezone: string;
  billing_contact_email: string;
  billing_contact_phone: string;
};

function ReadOnlyRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-zinc-100 py-3 last:border-0 dark:border-zinc-800 sm:grid-cols-[minmax(0,11rem)_1fr]">
      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-sm text-zinc-900 dark:text-zinc-100">{value ?? "—"}</dd>
    </div>
  );
}

export function CompanyProfilePanel() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [form, setForm] = useState({
    company_name: "",
    owner_name: "",
    phone: "",
    timezone: "Asia/Kuala_Lumpur",
    billing_contact_email: "",
    billing_contact_phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/company/profile", { credentials: "include" });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Could not load profile");
        return;
      }
      const p = j.profile as CompanyProfile;
      setProfile(p);
      setForm({
        company_name: p.company_name,
        owner_name: p.owner_name,
        phone: p.phone,
        timezone: p.timezone,
        billing_contact_email: p.billing_contact_email,
        billing_contact_phone: p.billing_contact_phone,
      });
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/company/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Could not save changes");
        return;
      }
      setProfile(j.profile);
      setSuccess("Profile updated.");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function copyCompanyId() {
    if (!profile?.company_id) return;
    try {
      await navigator.clipboard.writeText(profile.company_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  if (loading) {
    return <p className="px-4 py-12 text-center text-sm text-zinc-500">Loading profile…</p>;
  }

  if (!profile) {
    return (
      <p className="px-4 py-12 text-center text-sm text-red-600">{error || "Profile unavailable"}</p>
    );
  }

  const limitLabel = (used: number, max: number | null) =>
    max != null ? `${used} / ${max}` : String(used);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Company Profile</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          View and update your company account details.
        </p>
      </header>

      <div className="mb-6">
        <PageGuide pageId="company-profile" />
      </div>

      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Company ID</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="font-mono text-xl font-bold tracking-wide text-zinc-900 dark:text-zinc-50">
            {profile.company_id}
          </p>
          <button
            type="button"
            onClick={() => void copyCompanyId()}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {copied ? "Copied!" : "Copy Company ID"}
          </button>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Account overview</h2>
        <dl>
          <ReadOnlyRow label="Registered email" value={profile.email} />
          <ReadOnlyRow
            label="Email verified"
            value={
              profile.email_verified ? (
                <span className="text-emerald-700 dark:text-emerald-400">
                  Yes{profile.email_verified_at ? ` · ${profile.email_verified_at}` : ""}
                </span>
              ) : (
                <span className="text-amber-700 dark:text-amber-400">Not verified</span>
              )
            }
          />
          <ReadOnlyRow label="Registration date" value={profile.registration_date} />
          <ReadOnlyRow label="Current plan" value={profile.current_plan} />
          <ReadOnlyRow label="Payment status" value={profile.payment_status} />
          <ReadOnlyRow label="Trial start" value={profile.trial_start} />
          <ReadOnlyRow label="Trial end" value={profile.trial_end} />
          <ReadOnlyRow label="Subscription expiry" value={profile.subscription_expiry} />
          <ReadOnlyRow label="Staff count" value={limitLabel(profile.staff_count, profile.staff_limit)} />
          <ReadOnlyRow label="Shop count" value={limitLabel(profile.shop_count, profile.shop_limit)} />
          <ReadOnlyRow label="Account status" value={profile.account_status} />
        </dl>
      </section>

      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Editable details</h2>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Company name
            <input
              value={form.company_name}
              onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
              className="rounded-xl border border-zinc-300 px-4 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Owner name
            <input
              value={form.owner_name}
              onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))}
              className="rounded-xl border border-zinc-300 px-4 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Phone number
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="rounded-xl border border-zinc-300 px-4 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Timezone
            <select
              value={form.timezone}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
              className="rounded-xl border border-zinc-300 px-4 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
            >
              {COMPANY_TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
              {!COMPANY_TIMEZONE_OPTIONS.includes(
                form.timezone as (typeof COMPANY_TIMEZONE_OPTIONS)[number],
              ) ? (
                <option value={form.timezone}>{form.timezone}</option>
              ) : null}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Billing contact email
            <input
              type="email"
              value={form.billing_contact_email}
              onChange={(e) =>
                setForm((f) => ({ ...f, billing_contact_email: e.target.value }))
              }
              placeholder="Optional — for invoices"
              className="rounded-xl border border-zinc-300 px-4 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Billing contact phone
            <input
              value={form.billing_contact_phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, billing_contact_phone: e.target.value }))
              }
              placeholder="Optional"
              className="rounded-xl border border-zinc-300 px-4 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
        </div>
        {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}
        {success ? (
          <p className="mt-4 text-sm font-medium text-emerald-700 dark:text-emerald-400">{success}</p>
        ) : null}
        <button type="submit" disabled={saving} className={btnPrimary("mt-6 disabled:opacity-50")}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}

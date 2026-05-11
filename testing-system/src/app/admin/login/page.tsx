"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { adminLogin } from "@/actions/admin";
import { SiteHeader } from "@/components/SiteHeader";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const res = await adminLogin(password);
    setLoading(false);
    if (!res.ok) {
      setError(true);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <SiteHeader title="Testing System" subtitle="Admin sign-in" />
      <main className="mx-auto max-w-sm px-4 py-12 sm:px-6">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-drive-line bg-drive-surface p-6 shadow-sm"
        >
          <h1 className="text-lg font-semibold text-drive-ink">Dashboard access</h1>
          <p className="mt-1 text-sm text-drive-muted">
            Default password is <span className="font-mono">admin</span> unless you set{" "}
            <span className="font-mono">ADMIN_PASSWORD</span> in <span className="font-mono">.env.local</span>.
          </p>
          <label htmlFor="pw" className="mt-6 block text-sm font-medium text-drive-ink">
            Password
          </label>
          <input
            id="pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-xl border border-drive-line px-3 py-2.5 text-sm outline-none ring-drive-accent/30 focus:ring-2"
          />
          {error ? (
            <p className="mt-2 text-sm text-red-600">Incorrect password.</p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-drive-accent py-2.5 text-sm font-semibold text-white hover:bg-drive-accentMuted disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </main>
    </div>
  );
}

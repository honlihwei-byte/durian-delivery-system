"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { btnPrimary, MarketingShell } from "@/components/marketing/MarketingShell";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loginId, setLoginId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tokenFromUrl) return;
    setLoading(true);
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(tokenFromUrl)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        const j = await res.json();
        if (!res.ok) {
          setError(j.error || "Verification failed");
          return;
        }
        setLoginId(j.login_id);
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [tokenFromUrl]);

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Verification failed");
        return;
      }
      setLoginId(j.login_id);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (loginId) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-emerald-200 bg-emerald-50/90 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950/50">
        <h1 className="text-xl font-bold">Email verified</h1>
        <p className="mt-3 text-sm text-zinc-600">Your Company ID:</p>
        <p className="mt-4 font-mono text-2xl font-bold text-emerald-800">{loginId}</p>
        <p className="mt-4 text-xs text-zinc-500">14-day trial started</p>
        <button type="button" className={btnPrimary("mt-8 w-full")} onClick={() => router.push("/admin")}>
          Go to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-center text-2xl font-bold">Verify your email</h1>
      <p className="mt-2 text-center text-sm text-zinc-600">
        Open the link we sent, or enter your email and 6-digit code.
      </p>
      {loading && tokenFromUrl ? (
        <p className="mt-8 text-center text-sm text-zinc-500">Verifying link…</p>
      ) : (
        <form onSubmit={submitOtp} className="mt-8 flex flex-col gap-4 rounded-2xl border p-6">
          <label className="text-sm font-medium">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border px-4 py-3 dark:bg-zinc-900"
              required
            />
          </label>
          <label className="text-sm font-medium">
            Verification code
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1 w-full rounded-xl border px-4 py-3 text-center font-mono text-xl tracking-widest"
              maxLength={6}
              required
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" disabled={loading} className={btnPrimary("w-full disabled:opacity-50")}>
            Verify
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <MarketingShell narrow>
      <Suspense fallback={<p className="text-center text-sm text-zinc-500">Loading…</p>}>
        <VerifyEmailContent />
      </Suspense>
    </MarketingShell>
  );
}

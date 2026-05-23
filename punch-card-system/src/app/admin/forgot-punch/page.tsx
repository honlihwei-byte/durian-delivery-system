"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ForgotPunchReviewPanel } from "@/components/admin/ForgotPunchReviewPanel";

type Shop = { id: string; name: string };
type Staff = { id: string; staff_name: string; staff_code: string };

export default function ForgotPunchAdminPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [shopRes, staffRes] = await Promise.all([
          fetch("/api/shops"),
          fetch("/api/staff"),
        ]);
        const shopJson = await shopRes.json();
        const staffJson = await staffRes.json();
        if (!shopRes.ok) throw new Error(shopJson.error || "Failed to load shops");
        setShops((shopJson.shops ?? []) as Shop[]);
        setStaff((staffJson.staff ?? []) as Staff[]);
        if (!staffRes.ok) setStaff([]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Forgot Punch Requests
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Review staff corrections for missing clock in or out. Approving creates a manual attendance
            punch with an audit trail.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-600 dark:text-zinc-100"
        >
          ← Attendance
        </Link>
      </header>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <ForgotPunchReviewPanel shops={shops} staff={staff} />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SelfieReviewPanel } from "@/components/admin/SelfieReviewPanel";

type Shop = { id: string; name: string };
type Staff = { id: string; staff_name: string; staff_code: string };

export default function SelfieReviewPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [shopRes, staffRes] = await Promise.all([
          fetch("/api/shops", { credentials: "include" }),
          fetch("/api/staff", { credentials: "include" }),
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
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Selfie Review</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Front-camera selfie proof punches. Filter by date, staff, shop, or high risk.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold dark:border-zinc-600"
          >
            Attendance
          </Link>
          <Link
            href="/admin/photo-proof"
            className="rounded-lg border border-violet-300 px-3 py-2 text-sm font-semibold text-violet-900 dark:border-violet-800"
          >
            Photo Proof
          </Link>
        </div>
      </header>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <SelfieReviewPanel shops={shops} staff={staff} />
      )}
    </div>
  );
}

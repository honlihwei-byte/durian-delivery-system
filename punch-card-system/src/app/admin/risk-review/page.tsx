"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AntiBuddySettingsForm } from "@/components/admin/AntiBuddySettingsForm";
import { RiskReviewPanel } from "@/components/admin/RiskReviewPanel";

type Shop = { id: string; name: string };
type Staff = { id: string; staff_name: string; staff_code: string };

export default function RiskReviewPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);

  useEffect(() => {
    void (async () => {
      const [shopRes, staffRes] = await Promise.all([
        fetch("/api/shops", { credentials: "include" }),
        fetch("/api/staff", { credentials: "include" }),
      ]);
      const shopJson = await shopRes.json();
      const staffJson = await staffRes.json();
      if (shopRes.ok) setShops((shopJson.shops ?? []) as Shop[]);
      if (staffRes.ok) setStaff((staffJson.staff ?? []) as Staff[]);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <Link href="/admin" className="text-sm text-blue-600 underline dark:text-blue-400">
          ← Attendance
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Risk Review</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Review punches flagged for new devices, buddy punch patterns, weak GPS, and random selfie checks.
        </p>
      </header>

      <AntiBuddySettingsForm />
      <RiskReviewPanel shops={shops} staff={staff} />
    </div>
  );
}

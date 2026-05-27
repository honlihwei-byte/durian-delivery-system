"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShiftScheduleManager } from "@/components/admin/shift-schedule/ShiftScheduleManager";

type Shop = { id: string; name: string };
type Staff = { id: string; staff_name: string; staff_code: string; staff_type?: string };

export default function ShiftSchedulePage() {
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
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Shift Schedule</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Admin assigns shifts. Staff can only view assigned shifts. Attendance report compares actual punches
          against scheduled time.
        </p>
      </header>

      <ShiftScheduleManager shops={shops} staff={staff} />
    </div>
  );
}


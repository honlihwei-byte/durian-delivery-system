"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  SCHEDULE_MODE_LABELS,
  type ScheduleMode,
  type ScheduleSlot,
} from "@/lib/staff-schedule";

type Shop = { id: string; name: string };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function emptySlot(dow: number): ScheduleSlot {
  return {
    day_of_week: dow,
    schedule_date: null,
    biweekly_week: null,
    start_time: "09:00",
    end_time: "18:00",
  };
}

export function AddEmployeeForm() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [staffName, setStaffName] = useState("");
  const [phone, setPhone] = useState("");
  const [staffType, setStaffType] = useState<"full_time" | "part_time">("full_time");
  const [shopIds, setShopIds] = useState<Set<string>>(new Set());
  const [allowPunch, setAllowPunch] = useState(true);
  const [reportingManager, setReportingManager] = useState("");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("fixed_daily");
  const [defaultStart, setDefaultStart] = useState("09:00");
  const [defaultEnd, setDefaultEnd] = useState("18:00");
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);

  const loadShops = useCallback(async () => {
    const res = await fetch("/api/shops", { credentials: "include" });
    const j = await res.json();
    if (res.ok) setShops(j.shops ?? []);
  }, []);

  useEffect(() => {
    void loadShops();
  }, [loadShops]);

  function toggleShop(id: string) {
    setShopIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addWeeklySlot() {
    setSlots((s) => [...s, emptySlot(0)]);
  }

  function updateSlot(i: number, patch: Partial<ScheduleSlot>) {
    setSlots((arr) => arr.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function removeSlot(i: number) {
    setSlots((arr) => arr.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!staffName.trim()) {
      setError("Employee name is required.");
      return;
    }
    if (shopIds.size === 0) {
      setError("Assign at least one shop.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          staff_name: staffName.trim(),
          phone: phone.trim() || null,
          staff_type: staffType,
          shop_ids: [...shopIds],
          allow_punch: allowPunch,
          reporting_manager: reportingManager.trim() || null,
          schedule_mode: scheduleMode,
          default_start_time: defaultStart,
          default_end_time: defaultEnd,
          schedule_slots: scheduleMode === "fixed_daily" ? [] : slots,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to add employee");
      router.push("/admin/staff");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const sectionClass =
    "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950";

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 pb-16">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Add employee</h1>
          <p className="text-sm text-zinc-600">Set schedule for attendance comparison in reports.</p>
        </div>
        <Link href="/admin/staff" className="text-sm font-semibold underline">
          Back
        </Link>
      </header>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <section className={sectionClass}>
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">1. Basic details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
            Employee name
            <input
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="rounded-xl border px-4 py-3 dark:bg-zinc-900"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Phone number
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-xl border px-4 py-3 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Staff type
            <select
              value={staffType}
              onChange={(e) => setStaffType(e.target.value as "full_time" | "part_time")}
              className="rounded-xl border px-4 py-3 dark:bg-zinc-900"
            >
              <option value="full_time">Full time</option>
              <option value="part_time">Part time</option>
            </select>
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium">Assigned shop</legend>
            <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
              {shops.map((s) => (
                <li key={s.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={shopIds.has(s.id)}
                      onChange={() => toggleShop(s.id)}
                    />
                    {s.name}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">2. Work timing</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Default start
            <input
              type="time"
              value={defaultStart}
              onChange={(e) => setDefaultStart(e.target.value)}
              className="rounded-xl border px-4 py-3 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Default end
            <input
              type="time"
              value={defaultEnd}
              onChange={(e) => setDefaultEnd(e.target.value)}
              className="rounded-xl border px-4 py-3 dark:bg-zinc-900"
            />
          </label>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">3. Schedule mode</h2>
        <select
          value={scheduleMode}
          onChange={(e) => {
            setScheduleMode(e.target.value as ScheduleMode);
            if (e.target.value !== "fixed_daily" && slots.length === 0) {
              setSlots([emptySlot(0)]);
            }
          }}
          className="mt-4 w-full rounded-xl border px-4 py-3 text-sm dark:bg-zinc-900"
        >
          {(Object.keys(SCHEDULE_MODE_LABELS) as ScheduleMode[]).map((m) => (
            <option key={m} value={m}>
              {SCHEDULE_MODE_LABELS[m]}
            </option>
          ))}
        </select>

        {scheduleMode !== "fixed_daily" ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-zinc-500">
              {staffType === "part_time"
                ? "Add each working day and time (e.g. Mon 10:00–18:00)."
                : "Define recurring shift windows."}
            </p>
            {slots.map((slot, i) => (
              <div
                key={i}
                className="grid gap-2 rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2"
              >
                {scheduleMode === "custom" || scheduleMode === "monthly" ? (
                  <label className="text-xs font-medium sm:col-span-2">
                    Date
                    <input
                      type="date"
                      value={slot.schedule_date ?? ""}
                      onChange={(e) => updateSlot(i, { schedule_date: e.target.value })}
                      className="mt-1 w-full rounded-lg border px-2 py-2 dark:bg-zinc-950"
                    />
                  </label>
                ) : (
                  <label className="text-xs font-medium">
                    Day
                    <select
                      value={slot.day_of_week ?? 0}
                      onChange={(e) => updateSlot(i, { day_of_week: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border px-2 py-2 dark:bg-zinc-950"
                    >
                      {WEEKDAYS.map((d, di) => (
                        <option key={d} value={di}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {scheduleMode === "bi_weekly" ? (
                  <label className="text-xs font-medium">
                    Week
                    <select
                      value={slot.biweekly_week ?? 1}
                      onChange={(e) => updateSlot(i, { biweekly_week: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border px-2 py-2 dark:bg-zinc-950"
                    >
                      <option value={1}>Week 1</option>
                      <option value={2}>Week 2</option>
                    </select>
                  </label>
                ) : null}
                <label className="text-xs font-medium">
                  Start
                  <input
                    type="time"
                    value={slot.start_time}
                    onChange={(e) => updateSlot(i, { start_time: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-2 py-2 dark:bg-zinc-950"
                  />
                </label>
                <label className="text-xs font-medium">
                  End
                  <input
                    type="time"
                    value={slot.end_time}
                    onChange={(e) => updateSlot(i, { end_time: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-2 py-2 dark:bg-zinc-950"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeSlot(i)}
                  className="text-xs text-red-600 sm:col-span-2"
                >
                  Remove slot
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addWeeklySlot}
              className="text-sm font-semibold text-emerald-700"
            >
              + Add shift slot
            </button>
          </div>
        ) : null}
      </section>

      <section className={sectionClass}>
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">4. Punch permission</h2>
        <label className="mt-4 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={allowPunch}
            onChange={(e) => setAllowPunch(e.target.checked)}
            className="h-5 w-5 rounded"
          />
          Allow employee to punch (clock in / out)
        </label>
      </section>

      <section className={sectionClass}>
        <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
          5. Reporting manager (optional)
        </h2>
        <input
          value={reportingManager}
          onChange={(e) => setReportingManager(e.target.value)}
          placeholder="Manager name"
          className="mt-4 w-full rounded-xl border px-4 py-3 dark:bg-zinc-900"
        />
      </section>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-zinc-900 py-4 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {saving ? "Saving…" : "Save employee"}
      </button>
    </form>
  );
}

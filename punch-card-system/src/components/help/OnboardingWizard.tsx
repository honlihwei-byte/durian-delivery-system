"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STEPS = [
  {
    title: "Create Shop",
    description: "Add your first location with a name and address area.",
    href: "/admin/shops",
    cta: "Open Shops",
  },
  {
    title: "Configure GPS",
    description: "Set coordinates and radius (or GPS points) so on-site punches verify correctly.",
    href: "/admin/shops",
    cta: "Set GPS",
  },
  {
    title: "Add Staff",
    description: "Create employees and assign them to shops they work at.",
    href: "/admin/staff",
    cta: "Add Staff",
  },
  {
    title: "Create Shift Templates",
    description: "Define Morning, Full, or custom templates for shift-based shops.",
    href: "/admin/shops",
    cta: "Templates in Shops",
  },
  {
    title: "Start Attendance",
    description: "Print the Clock QR, have staff scan and punch, then review records here.",
    href: "/admin",
    cta: "Go to Attendance",
  },
] as const;

export function OnboardingWizard() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [dismissing, setDismissing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/company/onboarding", { credentials: "include" });
      const j = (await res.json()) as { show_wizard?: boolean };
      if (res.ok && j.show_wizard) setVisible(true);
    } catch {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function dismiss(action: "skip" | "complete") {
    setDismissing(true);
    try {
      await fetch("/api/company/onboarding", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } finally {
      setVisible(false);
      setDismissing(false);
    }
  }

  if (!visible) return null;

  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-wizard-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          Welcome to LW OpsFlow
        </p>
        <h2 id="onboarding-wizard-title" className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Setup wizard · Step {step + 1} of {STEPS.length}
        </h2>
        <p className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">{current.title}</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{current.description}</p>

        <div className="mt-4 flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-700"}`}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={current.href}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={() => void dismiss("complete")}
          >
            {current.cta}
          </Link>
          {!isLast ? (
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-600"
              disabled={dismissing}
              onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-600"
              disabled={dismissing}
              onClick={() => void dismiss("complete")}
            >
              Finish
            </button>
          )}
          <button
            type="button"
            className="ml-auto text-sm font-medium text-zinc-500 underline"
            disabled={dismissing}
            onClick={() => void dismiss("skip")}
          >
            Skip wizard
          </button>
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          Full walkthrough:{" "}
          <Link href="/help/getting-started" className="font-semibold text-blue-600 underline">
            Quick Start Guide
          </Link>
        </p>
      </div>
    </div>
  );
}

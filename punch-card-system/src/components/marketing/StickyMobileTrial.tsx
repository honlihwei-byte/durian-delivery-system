"use client";

import Link from "next/link";
import { btnPrimary } from "./MarketingShell";

/** Fixed trial CTA for mobile landing page conversion. */
export function StickyMobileTrial() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur-md sm:hidden"
      aria-label="Start free trial"
    >
      <Link href="/register" className={btnPrimary("w-full text-base")}>
        Start Free Trial
      </Link>
      <p className="mt-1.5 text-center text-[10px] text-[#64748B]">
        14-day trial · No credit card
      </p>
    </div>
  );
}

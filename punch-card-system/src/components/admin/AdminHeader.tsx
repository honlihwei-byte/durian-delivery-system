"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type SessionInfo = {
  role: "super_admin" | "company_admin";
  feature_access?: "full" | "billing_only" | "blocked";
  company?: { name: string; code: string; status_label?: string };
};

type Props = {
  session: SessionInfo;
  onLogout: () => void;
  onMenuClick: () => void;
};

function HeaderButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-sm font-medium text-[#0F172A] shadow-sm transition hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

function AccountMenu({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-sm font-medium text-[#0F172A] shadow-sm transition hover:bg-slate-50"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Account
        <svg className="h-4 w-4 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 min-w-[11rem] rounded-xl border border-[#E2E8F0] bg-white py-1 shadow-lg">
          <Link
            href="/admin/profile"
            className="block px-4 py-2.5 text-sm font-medium text-[#0F172A] hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            Company profile
          </Link>
          <Link
            href="/admin/billing"
            className="block px-4 py-2.5 text-sm font-medium text-[#0F172A] hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            Billing
          </Link>
          <button
            type="button"
            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-[#0F172A] hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AdminHeader({ session, onLogout, onMenuClick }: Props) {
  const handleLogout = useCallback(() => onLogout(), [onLogout]);

  return (
    <header className="sticky top-0 z-30 border-b border-[#E2E8F0] bg-white">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E8F0] text-[#64748B] transition hover:bg-slate-50 lg:hidden"
          aria-label="Open menu"
          onClick={onMenuClick}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {session.company ? (
            <>
              <span
                className="max-w-[200px] truncate rounded-xl border border-[#E2E8F0] bg-slate-50 px-3 py-1.5 text-sm font-medium text-[#0F172A] sm:max-w-[280px]"
                title={session.company.name}
              >
                {session.company.name}
              </span>
              <span className="hidden rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#2563EB] ring-1 ring-blue-100 sm:inline-flex">
                Company Admin
              </span>
              {session.company.status_label ? (
                <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-[#22C55E] ring-1 ring-emerald-100 sm:inline-flex">
                  {session.company.status_label}
                </span>
              ) : null}
            </>
          ) : (
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
              Super Admin
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {session.feature_access === "full" ? (
            <HeaderButton href="/help">Help Center</HeaderButton>
          ) : null}
          <HeaderButton href="/admin/billing">Billing</HeaderButton>
          <div className="hidden sm:block">
            <AccountMenu onLogout={handleLogout} />
          </div>
          <button
            type="button"
            className="inline-flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium text-[#0F172A] sm:hidden"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

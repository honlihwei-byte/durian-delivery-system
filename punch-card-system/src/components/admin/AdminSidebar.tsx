"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useI18n } from "@/components/i18n/LanguageProvider";

type NavItem = {
  labelKey: string;
  href: string;
  icon: React.ReactNode;
  match: (path: string) => boolean;
};

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center opacity-90">{children}</span>
  );
}

const NAV_ITEMS: NavItem[] = [
  {
    labelKey: "nav.dashboard",
    href: "/admin",
    match: (p) => p === "/admin",
    icon: (
      <NavIcon>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </NavIcon>
    ),
  },
  {
    labelKey: "nav.attendance",
    href: "/admin/attendance",
    match: (p) => p.startsWith("/admin/attendance"),
    icon: (
      <NavIcon>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </NavIcon>
    ),
  },
  {
    labelKey: "nav.schedule",
    href: "/admin/shift-schedule",
    match: (p) => p.startsWith("/admin/shift-schedule"),
    icon: (
      <NavIcon>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </NavIcon>
    ),
  },
  {
    labelKey: "nav.shops",
    href: "/admin/shops",
    match: (p) => p.startsWith("/admin/shops"),
    icon: (
      <NavIcon>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </NavIcon>
    ),
  },
  {
    labelKey: "nav.employees",
    href: "/admin/staff",
    match: (p) => p.startsWith("/admin/staff"),
    icon: (
      <NavIcon>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </NavIcon>
    ),
  },
  {
    labelKey: "nav.settings",
    href: "/admin/profile",
    match: (p) => p.startsWith("/admin/profile") || p.startsWith("/admin/billing"),
    icon: (
      <NavIcon>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </NavIcon>
    ),
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  featureAccess?: "full" | "billing_only" | "blocked";
};

export function AdminSidebar({ open, onClose, featureAccess = "full" }: Props) {
  const pathname = usePathname();
  const { t } = useI18n();

  const billingItems: NavItem[] = [
    {
      labelKey: "nav.billing",
      href: "/admin/billing",
      match: (p) =>
        p.startsWith("/admin/billing") ||
        p.startsWith("/billing") ||
        p.startsWith("/subscription-required"),
      icon: (
        <NavIcon>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </NavIcon>
      ),
    },
    NAV_ITEMS.find((i) => i.labelKey === "nav.settings")!,
  ];

  const items = featureAccess === "billing_only" ? billingItems : NAV_ITEMS;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-[#E2E8F0] bg-white transition-transform duration-200 lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
      aria-label="Admin sidebar"
    >
      <div className="flex h-16 items-center border-b border-[#E2E8F0] px-5">
        <BrandLogo href="/admin" size="nav-mobile" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.labelKey}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white shadow-sm shadow-blue-500/20"
                  : "text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A]"
              }`}
            >
              {item.icon}
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#E2E8F0] px-4 py-4">
        <p className="text-xs font-medium text-[#64748B]">{t("common.brandName")}</p>
        <p className="text-[11px] text-slate-400">{t("common.brandTagline")}</p>
      </div>
    </aside>
  );
}

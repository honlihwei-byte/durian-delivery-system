import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function MarketingShell({
  children,
  narrow,
  hideFooter,
}: {
  children: React.ReactNode;
  narrow?: boolean;
  hideFooter?: boolean;
}) {
  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <BrandLogo href="/" size="nav-mobile" className="sm:hidden" priority />
          <BrandLogo href="/" size="nav" className="hidden sm:inline-flex" priority />
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <Link
              href="/login"
              className="hidden rounded-xl px-3 py-2 text-[#64748B] transition hover:bg-slate-100 hover:text-[#0F172A] sm:inline-flex"
            >
              Company Login
            </Link>
            <Link href="/register" className={btnPrimary("px-4 py-2 text-sm")}>
              Start Free Trial
            </Link>
          </nav>
        </div>
      </header>

      <main className={`mx-auto px-4 py-8 sm:px-6 sm:py-12 ${narrow ? "max-w-lg" : "max-w-6xl"}`}>
        {children}
      </main>

      {!hideFooter ? (
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
            <div>
              <p className="text-sm font-bold text-[#0F172A]">LW OpsFlow</p>
              <p className="mt-1 max-w-xs text-sm text-[#64748B]">
                Smart workforce systems for SMEs.
              </p>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-[#64748B]">
              <a href="#features" className="hover:text-[#2563EB]">
                Features
              </a>
              <a href="#pricing" className="hover:text-[#2563EB]">
                Pricing
              </a>
              <a href="#faq" className="hover:text-[#2563EB]">
                FAQ
              </a>
              <Link href="/register" className="hover:text-[#2563EB]">
                Start Free Trial
              </Link>
              <a href="#contact" className="hover:text-[#2563EB]">
                Contact
              </a>
            </nav>
            <div id="contact" className="text-sm text-[#64748B]">
              <p className="font-semibold text-[#0F172A]">Contact</p>
              <ul className="mt-2 space-y-1.5">
                <li>
                  <span className="font-medium text-[#0F172A]">Phone / WhatsApp:</span>{" "}
                  <a href="tel:+60109873757" className="hover:text-[#2563EB]">
                    010-9873757
                  </a>
                </li>
                <li>
                  <span className="font-medium text-[#0F172A]">Email:</span>{" "}
                  <a href="mailto:lwopsflow@gmail.com" className="hover:text-[#2563EB]">
                    lwopsflow@gmail.com
                  </a>
                </li>
                <li>
                  <span className="font-medium text-[#0F172A]">Business hours:</span> Monday –
                  Friday, 9:00 AM – 6:00 PM
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 py-4 text-center text-xs text-[#64748B]">
            © 2026 LW OpsFlow. All rights reserved.
          </div>
        </footer>
      ) : null}
    </div>
  );
}

export function btnPrimary(className = "") {
  return `inline-flex min-h-[2.75rem] items-center justify-center rounded-xl bg-[#2563EB] px-6 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ${className}`;
}

export function btnSecondary(className = "") {
  return `inline-flex min-h-[2.75rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-center text-sm font-semibold text-[#0F172A] shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300 ${className}`;
}

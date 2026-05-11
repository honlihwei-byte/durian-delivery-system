import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader subtitle="Drive-thru mini market pickup" />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-drive-line bg-drive-surface p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-drive-accent">
            Order here
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-drive-ink">
            Scan the QR code, then tap below to browse products.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-drive-muted">
            Add items to your cart, enter your vehicle details, and complete the demo payment.
            Staff will see your order on the admin dashboard.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/shop"
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-drive-accent px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-drive-accentMuted"
            >
              Start order
            </Link>
            <Link
              href="/admin"
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-drive-line bg-drive-bg px-5 py-3 text-center text-sm font-semibold text-drive-ink transition hover:bg-drive-line/40"
            >
              Admin
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

import Link from "next/link";
import { AdminHubLinks } from "@/components/admin/AdminHubLinks";

const LINKS = [
  {
    href: "/admin/risk-review",
    title: "Risk Review",
    description: "Review flagged punches — new devices, buddy punch, weak GPS, selfie checks.",
  },
  {
    href: "/admin/security/selfie-verification",
    title: "Selfie Verification",
    description: "Company-wide selfie proof policy and random check percentage.",
  },
  {
    href: "/admin/security/device-control",
    title: "Device Control",
    description: "Trusted device enforcement — allow, require approval, or block unknown devices.",
  },
  {
    href: "/admin/security/gps-risk",
    title: "GPS Risk Settings",
    description: "Weak GPS alerts and indoor confidence guidance per shop.",
  },
];

export default function SecurityCenterPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <Link href="/admin" className="text-sm text-blue-600 underline dark:text-blue-400">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Security Center</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Attendance security and fraud prevention — separate from payroll reports.
        </p>
      </header>
      <AdminHubLinks links={LINKS} />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Per-shop toggles (selfie, device review, weak GPS, buddy punch) are under{" "}
        <Link href="/admin/shops" className="font-medium text-blue-600 underline dark:text-blue-400">
          Shops
        </Link>{" "}
        — open a shop and use the Security section.
      </p>
    </div>
  );
}

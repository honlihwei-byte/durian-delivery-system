import Link from "next/link";

export default function GpsRiskSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <Link href="/admin/security" className="text-sm text-blue-600 underline dark:text-blue-400">
          ← Security Center
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">GPS Risk Settings</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Weak GPS detection and indoor confidence for retail floors and malls.
        </p>
      </header>
      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900">
        <p>
          <strong>Per shop — Weak GPS alert:</strong> Enable under{" "}
          <Link href="/admin/shops" className="text-blue-600 underline">
            Shops
          </Link>{" "}
          → open a shop → <strong>Security</strong> → Enable Weak GPS Detection.
        </p>
        <p>
          <strong>Indoor Confidence Mode:</strong> Edit shop GPS coordinates and enable indoor mode
          on the shop card for sites with poor satellite signal.
        </p>
        <p>
          <strong>Location proof:</strong> Use attendance verification modes that include location
          proof when staff cannot get a reliable GPS fix.
        </p>
      </div>
    </div>
  );
}

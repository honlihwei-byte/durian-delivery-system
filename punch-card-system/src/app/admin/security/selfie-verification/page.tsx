import Link from "next/link";
import { AntiBuddySettingsForm } from "@/components/admin/AntiBuddySettingsForm";

export default function SelfieVerificationPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <Link href="/admin/security" className="text-sm text-blue-600 underline dark:text-blue-400">
          ← Security Center
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Selfie Verification</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Company default for front-camera selfie at punch. Shops can override under Shops → Security.
        </p>
      </header>
      <AntiBuddySettingsForm />
    </div>
  );
}

import type { Metadata } from "next";
import { SuperAdminLoginForm } from "@/components/auth/SuperAdminLoginForm";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: "Platform sign in",
  robots: { index: false, follow: false },
};

export default function SuperAdminLoginPage() {
  return (
    <MarketingShell narrow>
      <SuperAdminLoginForm />
    </MarketingShell>
  );
}

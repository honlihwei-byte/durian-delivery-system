import type { Metadata } from "next";
import { BillingSuccessPage } from "@/components/billing/BillingSuccessPage";

export const metadata: Metadata = {
  title: "Payment successful — OpsFlow",
};

export default function Page() {
  return <BillingSuccessPage />;
}

import { CustomerPageShell } from "@/components/CustomerPageShell";
import { HomePageClient } from "@/components/HomePageClient";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <CustomerPageShell>
      <HomePageClient />
    </CustomerPageShell>
  );
}

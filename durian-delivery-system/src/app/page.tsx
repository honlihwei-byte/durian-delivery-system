import { CustomerPageShell } from "@/components/CustomerPageShell";
import { HomePageClient } from "@/components/HomePageClient";

export default function HomePage() {
  return (
    <CustomerPageShell>
      <HomePageClient />
    </CustomerPageShell>
  );
}

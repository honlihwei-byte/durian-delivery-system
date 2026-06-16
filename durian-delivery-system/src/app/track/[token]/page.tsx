import { CustomerPageShell } from "@/components/CustomerPageShell";
import { TrackPageClient } from "@/components/TrackPageClient";
import { normalizeTrackingRef } from "@/lib/tracking";

type TrackPageProps = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";

export default async function TrackPage({ params }: TrackPageProps) {
  const { token } = await params;
  const decodedRef = normalizeTrackingRef(token);

  return (
    <CustomerPageShell>
      <TrackPageClient token={decodedRef} />
    </CustomerPageShell>
  );
}

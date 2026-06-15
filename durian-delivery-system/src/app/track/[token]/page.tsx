import { TrackOrderView } from "@/components/TrackOrderView";
import { isValidTrackingToken } from "@/lib/tracking";
import { notFound } from "next/navigation";

type TrackPageProps = {
  params: Promise<{ token: string }>;
};

export default async function TrackPage({ params }: TrackPageProps) {
  const { token } = await params;

  if (!isValidTrackingToken(token)) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:py-8">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold text-stone-900">Jejak Pesanan</h1>
          <p className="mt-1 text-sm text-stone-600">
            Musang King Delivery · Tempahan hari ini, hantar esok
          </p>
        </div>
        <TrackOrderView token={token} />
      </div>
    </main>
  );
}

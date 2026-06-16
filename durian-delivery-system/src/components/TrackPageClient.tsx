"use client";

import { TrackOrderView } from "@/components/TrackOrderView";
import { useLanguage } from "@/components/LanguageProvider";

type TrackPageClientProps = {
  token: string;
};

export function TrackPageClient({ token }: TrackPageClientProps) {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:py-8">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold text-stone-900">{t.track.pageTitle}</h1>
          <p className="mt-1 text-sm text-stone-600">{t.track.pageSubtitle}</p>
        </div>
        <TrackOrderView token={token} />
      </div>
    </main>
  );
}

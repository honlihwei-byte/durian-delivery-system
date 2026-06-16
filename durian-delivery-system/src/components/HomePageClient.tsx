"use client";

import { HeroBanner } from "@/components/HeroBanner";
import { OrderForm } from "@/components/OrderForm";
import { useLanguage } from "@/components/LanguageProvider";

export function HomePageClient() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-[#f7f3ea]">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:py-8">
        <HeroBanner />
        <OrderForm />
        <p className="pb-4 text-center text-xs text-stone-500">{t.footer}</p>
      </div>
    </main>
  );
}

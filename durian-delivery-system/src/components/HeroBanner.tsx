"use client";

import Image from "next/image";
import { useLanguage } from "./LanguageProvider";

export function HeroBanner() {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden rounded-2xl shadow-lg">
      <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
        <Image
          src="/musang-king-hero.png"
          alt={t.hero.alt}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 720px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
            {t.hero.tagline}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            {t.hero.title}
          </h1>
          <p className="mt-2 max-w-md text-sm font-semibold text-amber-100 sm:text-base">
            {t.hero.subtitle}
          </p>
          <p className="mt-1 max-w-md text-sm text-white/90">{t.hero.description}</p>
        </div>
      </div>
    </section>
  );
}

import Image from "next/image";

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl shadow-lg">
      <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
        <Image
          src="/musang-king-hero.png"
          alt="Musang King durian preorder promotion"
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 720px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
            Tempahan Hari Ini
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Musang King Delivery
          </h1>
          <p className="mt-2 max-w-md text-sm font-semibold text-amber-100 sm:text-base">
            Tempahan hari ini, hantar esok
          </p>
          <p className="mt-1 max-w-md text-sm text-white/90">
            Segar dari ladang. Bayar bila sampai (COD).
          </p>
        </div>
      </div>
    </section>
  );
}

import { Suspense } from "react";
import { isValidShopId, normalizeShopId } from "@/lib/shop-id";
import { ClockPageClient } from "./ClockPageClient";
import { ClockScreenSkeleton } from "./ClockScreenSkeleton";
import { InvalidShopLink } from "./InvalidShopLink";

export default async function ClockPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId: raw } = await params;
  const shopId = normalizeShopId(raw);

  if (!isValidShopId(shopId)) {
    return <InvalidShopLink />;
  }

  return (
    <Suspense fallback={<ClockScreenSkeleton message="Opening clock…" />}>
      <ClockPageClient shopId={shopId} />
    </Suspense>
  );
}

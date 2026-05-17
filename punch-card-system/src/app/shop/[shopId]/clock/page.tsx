import { isValidShopId, normalizeShopId } from "@/lib/shop-id";
import { ClockPageClient } from "./ClockPageClient";
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

  return <ClockPageClient shopId={shopId} />;
}

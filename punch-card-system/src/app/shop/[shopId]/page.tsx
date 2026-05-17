import { redirect } from "next/navigation";
import { normalizeShopId } from "@/lib/shop-id";

/** QR or bookmarks to /shop/{id} → clock page. */
export default async function ShopPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId: raw } = await params;
  const shopId = normalizeShopId(raw);
  redirect(`/shop/${encodeURIComponent(shopId)}/clock`);
}

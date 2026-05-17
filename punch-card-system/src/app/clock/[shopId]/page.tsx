import { redirect } from "next/navigation";
import { normalizeShopId } from "@/lib/shop-id";

/** Legacy/alternate QR path: /clock/{id} → /shop/{id}/clock */
export default async function ClockAliasPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId: raw } = await params;
  const shopId = normalizeShopId(raw);
  redirect(`/shop/${encodeURIComponent(shopId)}/clock`);
}

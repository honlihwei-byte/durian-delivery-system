import { redirect } from "next/navigation";
import { normalizeShopId } from "@/lib/shop-id";

/** Legacy/alternate QR path: /clock/{id} → /shop/{id}/clock (preserves ?t= token) */
export default async function ClockAliasPage({
  params,
  searchParams,
}: {
  params: Promise<{ shopId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { shopId: raw } = await params;
  const shopId = normalizeShopId(raw);
  const sp = await searchParams;
  const token = typeof sp.t === "string" && sp.t.trim() ? sp.t.trim() : "";
  const qs = token ? `?t=${encodeURIComponent(token)}` : "";
  redirect(`/shop/${encodeURIComponent(shopId)}/clock${qs}`);
}

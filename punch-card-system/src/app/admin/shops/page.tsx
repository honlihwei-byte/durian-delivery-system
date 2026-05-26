import dynamic from "next/dynamic";

const ShopManager = dynamic(() => import("./ShopManager").then((m) => ({ default: m.ShopManager })), {
  loading: () => <p className="px-4 py-8 text-sm text-zinc-500">Loading shops…</p>,
});

export default function ShopsAdminPage() {
  return <ShopManager />;
}

import dynamic from "next/dynamic";

const ShopManager = dynamic(() => import("../shops/ShopManager").then((m) => ({ default: m.ShopManager })), {
  loading: () => <p className="px-4 py-8 text-sm text-zinc-500">Loading…</p>,
});

export default function ShiftSchedulePage() {
  return <ShopManager variant="schedule" />;
}

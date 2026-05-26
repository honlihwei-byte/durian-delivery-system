import dynamic from "next/dynamic";

const StaffManager = dynamic(() => import("./StaffManager").then((m) => ({ default: m.StaffManager })), {
  loading: () => <p className="px-4 py-8 text-sm text-zinc-500">Loading staff…</p>,
});

export default function StaffAdminPage() {
  return <StaffManager />;
}

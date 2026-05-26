import dynamic from "next/dynamic";

const AddEmployeeForm = dynamic(
  () =>
    import("@/components/admin/staff/AddEmployeeForm").then((m) => ({
      default: m.AddEmployeeForm,
    })),
  {
    loading: () => <p className="px-4 py-8 text-sm text-zinc-500">Loading form…</p>,
  },
);

export default function AddEmployeePage() {
  return (
    <div className="px-4 py-8">
      <AddEmployeeForm />
    </div>
  );
}

import { StaffTasksPage } from "./StaffTasksPage";

export default async function ShopTasksRoute({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = await params;
  return <StaffTasksPage shopId={shopId} />;
}

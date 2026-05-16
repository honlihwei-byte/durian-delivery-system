import { ClockScreen } from "./ClockScreen";

export default async function ClockPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = await params;
  return <ClockScreen shopId={shopId} />;
}

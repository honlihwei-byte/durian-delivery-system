import { ClockErrorBoundary } from "@/components/ClockErrorBoundary";
import { ClockScreen } from "./ClockScreen";

export default async function ClockPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = await params;
  return (
    <ClockErrorBoundary>
      <ClockScreen shopId={shopId} />
    </ClockErrorBoundary>
  );
}

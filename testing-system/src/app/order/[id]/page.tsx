import { OrderTrackClient } from "./OrderTrackClient";

type Props = { params: Promise<{ id: string }> };

export default async function OrderPage({ params }: Props) {
  const { id } = await params;
  return <OrderTrackClient orderId={id} />;
}

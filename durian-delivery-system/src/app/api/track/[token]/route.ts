import { NextResponse } from "next/server";
import { formatDeliveryDateMY } from "@/lib/delivery";
import { formatDeliveryTimePreference } from "@/lib/labels";
import { findOrderByTrackingRef } from "@/lib/orders";
import type { Order, TrackedOrder } from "@/lib/types";
import { formatOrderNumber } from "@/lib/tracking";

function toTrackedOrder(order: Order): TrackedOrder {
  return {
    order_number: formatOrderNumber(order.id),
    status: order.status,
    order_items: (order.order_items ?? []).map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      line_subtotal: item.line_subtotal,
    })),
    product_subtotal: order.product_subtotal,
    delivery_fee: order.delivery_fee,
    total_amount: order.total_amount,
    delivery_date: formatDeliveryDateMY(order.delivery_date),
    delivery_date_raw: order.delivery_date,
    delivery_time_type: order.delivery_time_type,
    delivery_time_note: formatDeliveryTimePreference(order),
    delivery_note: order.delivery_note,
    customer_notes: order.notes,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  try {
    const { data, error } = await findOrderByTrackingRef(token);

    if (error) {
      console.error("Failed to fetch tracked order:", error);
      return NextResponse.json(
        { error: "Unable to load order." },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const tracked = toTrackedOrder(data);

    return NextResponse.json({
      order: tracked,
    });
  } catch (error) {
    console.error("Track order error:", error);
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 },
    );
  }
}

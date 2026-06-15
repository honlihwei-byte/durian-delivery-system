import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getTomorrowDateMY } from "@/lib/delivery";
import { calculateOrderPricing } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { validateCreateOrderInput } from "@/lib/validation";
import type { CreateOrderInput } from "@/lib/types";
import {
  formatOrderNumber,
  generateTrackingToken,
  getTrackingUrl,
} from "@/lib/tracking";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch orders:", error);
      return NextResponse.json(
        { error: "Unable to load orders." },
        { status: 500 },
      );
    }

    return NextResponse.json({ orders: data ?? [] });
  } catch (error) {
    console.error("Orders fetch error:", error);
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: Partial<CreateOrderInput>;

  try {
    body = (await request.json()) as Partial<CreateOrderInput>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const validation = validateCreateOrderInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const input = validation.data;
  const deliveryDate = getTomorrowDateMY();

  let pricing;
  try {
    pricing = calculateOrderPricing(input.items);
  } catch (error) {
    console.error("Pricing calculation error:", error);
    return NextResponse.json({ error: "Invalid cart." }, { status: 400 });
  }

  try {
    const supabase = createServerClient();
    const trackingToken = generateTrackingToken();
    const { data: result, error } = await supabase.rpc("create_order_with_items", {
      p_customer_name: input.customer_name,
      p_whatsapp_number: input.whatsapp_number,
      p_delivery_address: input.delivery_address,
      p_delivery_date: deliveryDate,
      p_delivery_time_type: input.delivery_time_type,
      p_preferred_delivery_time:
        input.delivery_time_type === "masa_pilihan"
          ? input.preferred_delivery_time ?? null
          : null,
      p_notes: input.notes ?? null,
      p_product_subtotal: pricing.productSubtotal,
      p_delivery_fee: pricing.deliveryFee,
      p_total_amount: pricing.totalAmount,
      p_tracking_token: trackingToken,
      p_items: pricing.items,
    });

    const orderId =
      result && typeof result === "object" && "order_id" in result
        ? String((result as { order_id: string }).order_id)
        : null;

    if (error || !orderId) {
      console.error("Failed to create order:", error);
      return NextResponse.json(
        { error: "Unable to place order. Please try again." },
        { status: 500 },
      );
    }

    const trackingUrl = getTrackingUrl(trackingToken);

    return NextResponse.json(
      {
        id: orderId,
        order_number: formatOrderNumber(orderId),
        tracking_token: trackingToken,
        tracking_url: trackingUrl,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 },
    );
  }
}

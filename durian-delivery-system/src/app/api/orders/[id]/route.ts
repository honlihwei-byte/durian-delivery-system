import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { ORDER_STATUSES } from "@/lib/labels";
import { isForwardStatusTransition } from "@/lib/order-status";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderStatus } from "@/lib/types";
import { MAX_DELIVERY_NOTE_LENGTH } from "@/lib/validation";

function isValidStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { status?: string; delivery_note?: string | null; admin_seen?: boolean };
  try {
    body = (await request.json()) as {
      status?: string;
      delivery_note?: string | null;
      admin_seen?: boolean;
    };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const status = body.status;
  const hasStatus = status !== undefined;
  const hasDeliveryNote = body.delivery_note !== undefined;
  const hasAdminSeen = body.admin_seen !== undefined;

  if (!hasStatus && !hasDeliveryNote && !hasAdminSeen) {
    return NextResponse.json(
      { error: "No updates provided." },
      { status: 400 },
    );
  }

  if (hasStatus && (!status || !isValidStatus(status))) {
    return NextResponse.json(
      { error: "Invalid order status." },
      { status: 400 },
    );
  }

  let deliveryNote: string | null | undefined;
  if (hasDeliveryNote) {
    if (body.delivery_note === null) {
      deliveryNote = null;
    } else {
      const trimmed = body.delivery_note?.trim() ?? "";
      if (trimmed.length > MAX_DELIVERY_NOTE_LENGTH) {
        return NextResponse.json(
          { error: "Delivery note is too long." },
          { status: 400 },
        );
      }
      deliveryNote = trimmed || null;
    }
  }

  try {
    const supabase = createAdminClient();

    const { data: existingOrder, error: fetchError } = await supabase
      .from("orders")
      .select("status")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("Failed to fetch order:", fetchError);
      return NextResponse.json(
        { error: "Unable to update order." },
        { status: 500 },
      );
    }

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (
      hasStatus &&
      status &&
      !isForwardStatusTransition(existingOrder.status as OrderStatus, status)
    ) {
      return NextResponse.json(
        { error: "Status can only move forward in the workflow." },
        { status: 400 },
      );
    }

    const updates: {
      status?: OrderStatus;
      delivery_note?: string | null;
      admin_seen?: boolean;
    } = {};
    if (hasStatus && status) {
      updates.status = status;
    }
    if (hasDeliveryNote) {
      updates.delivery_note = deliveryNote ?? null;
    }
    if (hasAdminSeen && body.admin_seen === true) {
      updates.admin_seen = true;
    }

    const { data, error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", id)
      .select("*, order_items(*)")
      .single();

    if (error) {
      console.error("Failed to update order:", error);
      return NextResponse.json(
        { error: "Unable to update order." },
        { status: 500 },
      );
    }

    return NextResponse.json({ order: data });
  } catch (error) {
    console.error("Order update error:", error);
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 },
    );
  }
}

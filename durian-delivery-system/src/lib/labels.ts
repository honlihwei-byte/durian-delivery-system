import type { DeliveryTimeType, Order, OrderStatus } from "./types";

export const DELIVERY_TIME_TYPES: DeliveryTimeType[] = [
  "bila_bila_masa",
  "masa_pilihan",
];

export const DELIVERY_TIME_TYPE_LABELS: Record<DeliveryTimeType, string> = {
  bila_bila_masa: "Bila-bila Masa",
  masa_pilihan: "Saya ada masa pilihan",
};

export const DELIVERY_SCHEDULE_NOTICE =
  "Tempahan hari ini akan dihantar esok selepas buah dibuka dan dibungkus segar. Masa penghantaran adalah anggaran dan bergantung kepada laluan penghantaran.";

export function formatDeliveryTimePreference(
  order: Pick<Order, "delivery_time_type" | "preferred_delivery_time">,
): string {
  if (
    order.delivery_time_type === "masa_pilihan" &&
    order.preferred_delivery_time
  ) {
    return order.preferred_delivery_time;
  }

  return "Bila-bila Masa";
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New Order",
  confirmed: "Confirmed",
  preparing_tomorrow_morning: "Preparing Tomorrow Morning",
  packed: "Packed",
  out_for_delivery: "Out For Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const CUSTOMER_ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New Order",
  confirmed: "Confirmed",
  preparing_tomorrow_morning: "Preparing",
  packed: "Packed",
  out_for_delivery: "Out For Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUSES: OrderStatus[] = [
  "new",
  "confirmed",
  "preparing_tomorrow_morning",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export const TRACKING_ORDER_STATUSES: OrderStatus[] = [
  "new",
  "confirmed",
  "preparing_tomorrow_morning",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

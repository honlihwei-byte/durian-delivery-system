import type { Order, OrderStatus } from "@/lib/types";

export type AdminFilterTab =
  | "all"
  | "new"
  | "preparing"
  | "on_delivery"
  | "completed";

export const ADMIN_FILTER_TABS: Array<{
  id: AdminFilterTab;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "preparing", label: "Preparing" },
  { id: "on_delivery", label: "On Delivery" },
  { id: "completed", label: "Completed" },
];

const PREPARING_STATUSES: OrderStatus[] = [
  "confirmed",
  "preparing_tomorrow_morning",
  "packed",
];

const ON_DELIVERY_STATUSES: OrderStatus[] = ["out_for_delivery"];

const COMPLETED_STATUSES: OrderStatus[] = ["delivered", "cancelled"];

export function matchesAdminFilter(order: Order, filter: AdminFilterTab): boolean {
  switch (filter) {
    case "all":
      return true;
    case "new":
      return order.status === "new";
    case "preparing":
      return PREPARING_STATUSES.includes(order.status);
    case "on_delivery":
      return ON_DELIVERY_STATUSES.includes(order.status);
    case "completed":
      return COMPLETED_STATUSES.includes(order.status);
    default:
      return true;
  }
}

export function formatOrderItemsSummary(order: Order): string {
  return (order.order_items ?? [])
    .map((item) => `${item.product_name} x${item.quantity}`)
    .join(", ");
}

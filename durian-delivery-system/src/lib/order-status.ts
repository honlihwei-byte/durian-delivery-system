import { ORDER_STATUSES } from "./labels";
import type { OrderStatus } from "./types";

export function isForwardStatusTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  if (to === "cancelled") {
    return from !== "cancelled";
  }

  const fromIndex = ORDER_STATUSES.indexOf(from);
  const toIndex = ORDER_STATUSES.indexOf(to);
  return fromIndex >= 0 && toIndex > fromIndex;
}

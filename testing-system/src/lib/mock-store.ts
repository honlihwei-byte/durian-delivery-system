import { randomUUID } from "crypto";
import { MOCK_PRODUCTS } from "@/data/mock-products";
import type { OrderItemRow, OrderRow, OrderStatus, Product } from "@/types";

type StoredOrder = {
  order: OrderRow;
  items: OrderItemRow[];
};

function cloneCatalog(): Product[] {
  return MOCK_PRODUCTS.map((p) => ({ ...p }));
}

let catalog: Product[] = cloneCatalog();
const orders = new Map<string, StoredOrder>();

function productById(id: string): Product | undefined {
  return catalog.find((p) => p.id === id);
}

function nowIso() {
  return new Date().toISOString();
}

function sortAdminRows(
  rows: { order: OrderRow; items: OrderItemRow[] }[]
): { order: OrderRow; items: OrderItemRow[] }[] {
  return [...rows].sort((a, b) => {
    const ar = a.order.arrived ? 1 : 0;
    const br = b.order.arrived ? 1 : 0;
    if (ar !== br) return br - ar;
    if (a.order.arrived && b.order.arrived) {
      return (b.order.arrived_at ?? "").localeCompare(a.order.arrived_at ?? "");
    }
    return b.order.created_at.localeCompare(a.order.created_at);
  });
}

export function mockGetProducts(): Product[] {
  return [...catalog].sort(
    (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );
}

export function mockGetOrders(): OrderRow[] {
  return sortAdminRows(
    Array.from(orders.values()).map((s) => ({
      order: { ...s.order },
      items: s.items,
    }))
  ).map((r) => r.order);
}

export function mockGetAdminOrders(): { order: OrderRow; items: OrderItemRow[] }[] {
  return sortAdminRows(
    Array.from(orders.values()).map((s) => ({
      order: { ...s.order },
      items: s.items.map((i) => ({
        ...i,
        product: i.product ? { ...i.product } : null,
      })),
    }))
  );
}

export function mockGetOrderItemCounts(): Map<string, number> {
  const map = new Map<string, number>();
  for (const [id, s] of orders) {
    const units = s.items.reduce((n, i) => n + i.quantity, 0);
    map.set(id, units);
  }
  return map;
}

export function mockCompleteDemoPayment(orderId: string): { ok: true } | { ok: false; error: string } {
  const stored = orders.get(orderId);
  if (!stored) return { ok: false, error: "Order not found." };
  if (stored.order.status !== "pending") {
    return { ok: false, error: "This order is not awaiting payment." };
  }
  if (!stored.items.length) return { ok: false, error: "Order has no items." };

  for (const row of stored.items) {
    const p = productById(row.product_id);
    if (!p || p.stock < row.quantity) {
      return { ok: false, error: "Insufficient stock to complete payment." };
    }
  }

  for (const row of stored.items) {
    const p = productById(row.product_id);
    if (!p) return { ok: false, error: "Stock update failed." };
    const next = p.stock - row.quantity;
    if (next < 0) return { ok: false, error: "Insufficient stock." };
    p.stock = next;
  }

  const t = nowIso();
  stored.order.status = "paid";
  stored.order.updated_at = t;
  return { ok: true };
}

export function mockRecordArrival(
  orderId: string,
  input: { carPlate: string; carColor: string; locationNote: string }
): { ok: true } | { ok: false; error: string } {
  const stored = orders.get(orderId);
  if (!stored) return { ok: false, error: "Order not found." };

  const allowed: OrderStatus[] = ["paid", "preparing", "ready"];
  if (!allowed.includes(stored.order.status)) {
    return { ok: false, error: "You can only check in after payment is complete." };
  }
  if (stored.order.arrived) {
    return { ok: false, error: "You have already checked in." };
  }

  const plate = input.carPlate.trim().toUpperCase();
  const color = input.carColor.trim();
  const note = input.locationNote.trim();
  if (!plate || !color || !note) {
    return { ok: false, error: "Please fill in plate, color, and parking or location note." };
  }

  const t = nowIso();
  stored.order.arrived = true;
  stored.order.arrived_at = t;
  stored.order.arrival_car_plate = plate;
  stored.order.arrival_car_color = color;
  stored.order.arrival_location_note = note;
  stored.order.updated_at = t;
  return { ok: true };
}

export function mockUpdateOrderStatus(
  orderId: string,
  status: OrderStatus
): { ok: true } | { ok: false; error: string } {
  const stored = orders.get(orderId);
  if (!stored) return { ok: false, error: "Order not found." };
  stored.order.status = status;
  stored.order.updated_at = nowIso();
  return { ok: true };
}

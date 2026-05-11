import { randomUUID } from "crypto";
import { MOCK_PRODUCTS } from "@/data/mock-products";
import type { CartLine } from "@/types";
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

export function mockGetOrderWithItems(
  orderId: string
): { order: OrderRow; items: OrderItemRow[] } | null {
  const s = orders.get(orderId);
  if (!s) return null;
  return {
    order: { ...s.order },
    items: s.items.map((i) => ({ ...i, product: i.product ? { ...i.product } : null })),
  };
}

export function mockGetOrderItemCounts(): Map<string, number> {
  const map = new Map<string, number>();
  for (const [id, s] of orders) {
    const units = s.items.reduce((n, i) => n + i.quantity, 0);
    map.set(id, units);
  }
  return map;
}

export function mockCreatePendingOrder(input: {
  customerName: string;
  phone: string;
  carPlate: string;
  lines: CartLine[];
}): { ok: true; orderId: string } | { ok: false; error: string } {
  const name = input.customerName.trim();
  const phone = input.phone.trim();
  const carPlate = input.carPlate.trim().toUpperCase();
  if (!name || !phone || !carPlate) {
    return { ok: false, error: "Please fill in all fields." };
  }
  if (!input.lines.length) {
    return { ok: false, error: "Your cart is empty." };
  }

  let total = 0;
  const items: OrderItemRow[] = [];

  for (const line of input.lines) {
    const p = productById(line.productId);
    if (!p) {
      return { ok: false, error: "A product in your cart is no longer available." };
    }
    const stock = p.stock;
    const unit = Number(p.price);
    if (line.quantity > stock) {
      return {
        ok: false,
        error: `Not enough stock for an item in your cart (max ${stock}).`,
      };
    }
    total += unit * line.quantity;
    items.push({
      id: randomUUID(),
      order_id: "",
      product_id: p.id,
      quantity: line.quantity,
      unit_price: unit,
      product: { name: p.name, image_url: p.image_url },
    });
  }

  const orderId = randomUUID();
  const t = nowIso();
  const order: OrderRow = {
    id: orderId,
    customer_name: name,
    phone,
    car_plate: carPlate,
    status: "pending",
    total: Math.round(total * 100) / 100,
    created_at: t,
    updated_at: t,
    arrived: false,
    arrived_at: null,
    arrival_car_plate: null,
    arrival_car_color: null,
    arrival_location_note: null,
  };

  for (const it of items) {
    it.order_id = orderId;
  }

  orders.set(orderId, { order, items });
  return { ok: true, orderId };
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

import { MOCK_PRODUCTS } from "@/data/mock-products";
import type { CartLine, OrderItemRow, OrderRow, OrderStatus } from "@/types";

const STORAGE_KEY = "testing-system-demo-orders-v1";

type StoredOrder = { order: OrderRow; items: OrderItemRow[] };
type StoreShape = Record<string, StoredOrder>;

function productById(id: string) {
  return MOCK_PRODUCTS.find((p) => p.id === id);
}

function nowIso() {
  return new Date().toISOString();
}

function readStore(): StoreShape {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoreShape;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeStore(store: StoreShape) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getDemoOrderWithItems(
  orderId: string
): { order: OrderRow; items: OrderItemRow[] } | null {
  if (typeof window === "undefined") return null;
  const s = readStore()[orderId];
  if (!s) return null;
  return {
    order: { ...s.order },
    items: s.items.map((i) => ({
      ...i,
      product: i.product ? { ...i.product } : null,
    })),
  };
}

export type CreateDemoOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

export function createDemoPendingOrder(input: {
  customerName: string;
  phone: string;
  carPlate: string;
  lines: CartLine[];
}): CreateDemoOrderResult {
  if (typeof window === "undefined") {
    return { ok: false, error: "Checkout is only available in the browser." };
  }

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
      id: crypto.randomUUID(),
      order_id: "",
      product_id: p.id,
      quantity: line.quantity,
      unit_price: unit,
      product: { name: p.name, image_url: p.image_url },
    });
  }

  const orderId = crypto.randomUUID();
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

  const store = readStore();
  store[orderId] = { order, items };
  writeStore(store);
  return { ok: true, orderId };
}

export type DemoSimpleResult = { ok: true } | { ok: false; error: string };

export function completeLocalDemoPayment(orderId: string): DemoSimpleResult {
  if (typeof window === "undefined") {
    return { ok: false, error: "Unavailable." };
  }
  const store = readStore();
  const stored = store[orderId];
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

  const t = nowIso();
  stored.order.status = "paid";
  stored.order.updated_at = t;
  store[orderId] = stored;
  writeStore(store);
  return { ok: true };
}

export function recordLocalCustomerArrival(
  orderId: string,
  input: { carPlate: string; carColor: string; locationNote: string }
): DemoSimpleResult {
  if (typeof window === "undefined") {
    return { ok: false, error: "Unavailable." };
  }
  const store = readStore();
  const stored = store[orderId];
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
  store[orderId] = stored;
  writeStore(store);
  return { ok: true };
}

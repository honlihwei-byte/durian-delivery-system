import {
  mockGetAdminOrders,
  mockGetOrderItemCounts,
  mockGetOrderWithItems,
  mockGetOrders,
  mockGetProducts,
} from "@/lib/mock-store";
import type { OrderItemRow, OrderRow, Product } from "@/types";

export async function getProducts(): Promise<Product[]> {
  return mockGetProducts();
}

export async function getOrders(): Promise<OrderRow[]> {
  return mockGetOrders();
}

export async function getAdminOrders(): Promise<{ order: OrderRow; items: OrderItemRow[] }[]> {
  return mockGetAdminOrders();
}

export async function getOrderWithItems(orderId: string): Promise<{
  order: OrderRow;
  items: OrderItemRow[];
} | null> {
  return mockGetOrderWithItems(orderId);
}

export async function getOrderItemCounts(): Promise<Map<string, number>> {
  return mockGetOrderItemCounts();
}

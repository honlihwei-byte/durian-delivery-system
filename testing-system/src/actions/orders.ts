"use server";

import { revalidatePath } from "next/cache";
import {
  mockCompleteDemoPayment,
  mockCreatePendingOrder,
  mockRecordArrival,
} from "@/lib/mock-store";
import type { CartLine } from "@/types";

export type CreateOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

export async function createPendingOrder(input: {
  customerName: string;
  phone: string;
  carPlate: string;
  lines: CartLine[];
}): Promise<CreateOrderResult> {
  const res = mockCreatePendingOrder(input);
  if (res.ok) revalidatePath("/admin");
  return res;
}

export type SimpleResult = { ok: true } | { ok: false; error: string };

export async function completeDemoPayment(orderId: string): Promise<SimpleResult> {
  const res = mockCompleteDemoPayment(orderId);
  if (res.ok) {
    revalidatePath("/admin");
    revalidatePath(`/order/${orderId}`);
  }
  return res;
}

export async function recordCustomerArrival(
  orderId: string,
  input: { carPlate: string; carColor: string; locationNote: string }
): Promise<SimpleResult> {
  const res = mockRecordArrival(orderId, input);
  if (res.ok) {
    revalidatePath("/admin");
    revalidatePath(`/order/${orderId}`);
  }
  return res;
}

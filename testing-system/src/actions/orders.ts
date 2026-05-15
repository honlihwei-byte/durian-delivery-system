"use server";

import { revalidatePath } from "next/cache";
import { mockCompleteDemoPayment, mockRecordArrival } from "@/lib/mock-store";

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

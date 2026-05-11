"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { mockUpdateOrderStatus } from "@/lib/mock-store";
import type { OrderStatus } from "@/types";
import { ORDER_STATUSES } from "@/types";

const COOKIE = "ts_admin";

export async function adminLogin(password: string): Promise<{ ok: boolean }> {
  const expected = process.env.ADMIN_PASSWORD ?? "admin";
  if (password !== expected) {
    return { ok: false };
  }
  const store = await cookies();
  store.set(COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return { ok: true };
}

export async function adminLogout() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<{ ok: boolean; error?: string }> {
  if (!ORDER_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status" };
  }
  const res = mockUpdateOrderStatus(orderId, status);
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/admin");
  return { ok: true };
}

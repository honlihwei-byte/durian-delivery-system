import { createAdminClient } from "@/lib/supabase/admin";
import type { Order } from "@/lib/types";
import {
  isValidTrackingCode,
  isValidTrackingRef,
  isValidTrackingToken,
  normalizeTrackingRef,
} from "@/lib/tracking";

async function findOrderByTrackingCode(code: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("tracking_code", code)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return { data: (data as Order | null) ?? null, error: null };
}

async function findOrderByTrackingToken(token: string) {
  const supabase = createAdminClient();

  const { data: exactMatch, error: exactError } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("tracking_token", token)
    .maybeSingle();

  if (exactError) {
    return { data: null, error: exactError };
  }

  if (exactMatch) {
    return { data: exactMatch as Order, error: null };
  }

  const { data: caseInsensitiveMatch, error: ilikeError } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .ilike("tracking_token", token)
    .maybeSingle();

  if (ilikeError) {
    return { data: null, error: ilikeError };
  }

  return { data: (caseInsensitiveMatch as Order | null) ?? null, error: null };
}

export async function findOrderByTrackingRef(ref: string) {
  const normalized = normalizeTrackingRef(ref);

  if (!isValidTrackingRef(normalized)) {
    return { data: null, error: null };
  }

  if (isValidTrackingCode(normalized)) {
    const byCode = await findOrderByTrackingCode(normalized);
    if (byCode.error || byCode.data) {
      return byCode;
    }
  }

  if (isValidTrackingToken(normalized)) {
    return findOrderByTrackingToken(normalized);
  }

  return { data: null, error: null };
}

import { DELIVERY_TIME_TYPES } from "./labels";
import { isValidProductId } from "./pricing";
import type {
  CartLineInput,
  CreateOrderInput,
  DeliveryTimeType,
  ProductId,
} from "./types";

export const MAX_QUANTITY = 99;
export const MAX_DELIVERY_NOTE_LENGTH = 500;
export const MAX_NAME_LENGTH = 100;
export const MAX_WHATSAPP_LENGTH = 20;
export const MAX_ADDRESS_LENGTH = 500;
export const MAX_NOTES_LENGTH = 500;
export const MAX_PREFERRED_TIME_LENGTH = 100;

export type CartParseResult =
  | { ok: true; lines: CartLineInput[] }
  | { ok: false; error: string };

export function isValidWhatsAppNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 13;
}

export function parseCartLines(
  lines: CartLineInput[] | undefined,
): CartParseResult {
  if (!Array.isArray(lines)) {
    return { ok: false, error: "Invalid cart data." };
  }

  const merged = new Map<ProductId, number>();

  for (const line of lines) {
    if (!line || typeof line.product_id !== "string") {
      return { ok: false, error: "Invalid cart data." };
    }

    if (!isValidProductId(line.product_id)) {
      return { ok: false, error: "Invalid product in cart." };
    }

    if (!Number.isInteger(line.quantity) || line.quantity < 0) {
      return { ok: false, error: "Invalid quantity." };
    }

    if (line.quantity > MAX_QUANTITY) {
      return {
        ok: false,
        error: `Kuantiti maksimum ialah ${MAX_QUANTITY} setiap pakej.`,
      };
    }

    if (line.quantity > 0) {
      merged.set(
        line.product_id,
        (merged.get(line.product_id) ?? 0) + line.quantity,
      );
    }
  }

  const result = [...merged.entries()].map(([product_id, quantity]) => ({
    product_id,
    quantity,
  }));

  if (result.length === 0) {
    return { ok: false, error: "Sila pilih sekurang-kurangnya 1 pakej." };
  }

  return { ok: true, lines: result };
}

export type OrderInputValidationResult =
  | { ok: true; data: CreateOrderInput }
  | { ok: false; error: string };

export function validateCreateOrderInput(
  body: Partial<CreateOrderInput>,
): OrderInputValidationResult {
  const customerName = body.customer_name?.trim() ?? "";
  const whatsappNumber = body.whatsapp_number?.trim() ?? "";
  const deliveryAddress = body.delivery_address?.trim() ?? "";
  const deliveryTimeType = body.delivery_time_type;
  const preferredDeliveryTime = body.preferred_delivery_time?.trim() ?? "";
  const notes = body.notes?.trim() ?? "";
  const cartResult = parseCartLines(body.items);

  if (!customerName) {
    return { ok: false, error: "Nama diperlukan." };
  }

  if (customerName.length > MAX_NAME_LENGTH) {
    return { ok: false, error: "Nama terlalu panjang." };
  }

  if (!whatsappNumber) {
    return { ok: false, error: "No. WhatsApp diperlukan." };
  }

  if (
    whatsappNumber.length > MAX_WHATSAPP_LENGTH ||
    !isValidWhatsAppNumber(whatsappNumber)
  ) {
    return { ok: false, error: "Sila masukkan no. WhatsApp yang sah." };
  }

  if (!deliveryAddress) {
    return { ok: false, error: "Alamat penghantaran diperlukan." };
  }

  if (deliveryAddress.length > MAX_ADDRESS_LENGTH) {
    return { ok: false, error: "Alamat terlalu panjang." };
  }

  if (
    !deliveryTimeType ||
    !DELIVERY_TIME_TYPES.includes(deliveryTimeType as DeliveryTimeType)
  ) {
    return { ok: false, error: "Sila pilih pilihan masa penghantaran." };
  }

  if (deliveryTimeType === "masa_pilihan") {
    if (!preferredDeliveryTime) {
      return { ok: false, error: "Sila masukkan masa pilihan anda." };
    }

    if (preferredDeliveryTime.length > MAX_PREFERRED_TIME_LENGTH) {
      return { ok: false, error: "Masa pilihan terlalu panjang." };
    }
  }

  if (notes.length > MAX_NOTES_LENGTH) {
    return { ok: false, error: "Nota terlalu panjang." };
  }

  if (!cartResult.ok) {
    return cartResult;
  }

  return {
    ok: true,
    data: {
      customer_name: customerName,
      whatsapp_number: whatsappNumber,
      delivery_address: deliveryAddress,
      delivery_time_type: deliveryTimeType,
      preferred_delivery_time:
        deliveryTimeType === "masa_pilihan" ? preferredDeliveryTime : undefined,
      notes: notes || undefined,
      items: cartResult.lines,
    },
  };
}

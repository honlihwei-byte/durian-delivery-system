import type { Translations } from "./types";

type ErrorKey = keyof Translations["errors"];

const API_ERROR_KEYS: Record<string, ErrorKey> = {
  "Sila pilih sekurang-kurangnya 1 pakej.": "selectPackage",
  "Nama diperlukan.": "nameRequired",
  "Nama terlalu panjang.": "nameTooLong",
  "No. WhatsApp diperlukan.": "whatsappRequired",
  "Sila masukkan no. WhatsApp yang sah.": "whatsappInvalid",
  "Alamat penghantaran diperlukan.": "addressRequired",
  "Alamat terlalu panjang.": "addressTooLong",
  "Sila pilih pilihan masa penghantaran.": "deliveryTimeRequired",
  "Sila masukkan masa pilihan anda.": "preferredTimeRequired",
  "Masa pilihan terlalu panjang.": "preferredTimeTooLong",
  "Nota terlalu panjang.": "notesTooLong",
  "Invalid cart data.": "invalidCart",
  "Invalid product in cart.": "invalidCart",
  "Invalid quantity.": "invalidCart",
  "Unable to place order. Please try again.": "placeOrderFailed",
};

export function translateApiError(
  message: string | undefined,
  t: Translations,
  formatMessage: (
    template: string,
    values?: Record<string, string | number>,
  ) => string,
): string {
  if (!message) {
    return t.errors.placeOrderFailed;
  }

  const maxQuantityMatch = message.match(/^Kuantiti maksimum ialah (\d+) setiap pakej\.$/);
  if (maxQuantityMatch) {
    return formatMessage(t.errors.maxQuantity, { max: maxQuantityMatch[1] });
  }

  const errorKey = API_ERROR_KEYS[message];
  if (errorKey) {
    return t.errors[errorKey];
  }

  return t.errors.placeOrderFailed;
}

"use client";

import { CopyButton } from "@/components/CopyButton";
import { getTrackingUrl, getWhatsAppShareUrl } from "@/lib/tracking";

type OrderSuccessProps = {
  orderId: string;
  orderNumber: string;
  trackingToken: string;
  onNewOrder: () => void;
};

export function OrderSuccess({
  orderId,
  orderNumber,
  trackingToken,
  onNewOrder,
}: OrderSuccessProps) {
  const trackingUrl =
    typeof window !== "undefined"
      ? getTrackingUrl(trackingToken, window.location.origin)
      : getTrackingUrl(trackingToken);

  const whatsappMessage = `Tempahan Musang King saya:\nNo. Pesanan: ${orderNumber}\nJejak pesanan: ${trackingUrl}`;
  const whatsappShareUrl = getWhatsAppShareUrl(whatsappMessage);

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
          ✓
        </div>
        <h2 className="mt-4 text-xl font-bold text-emerald-900">
          Tempahan Diterima!
        </h2>
        <p className="mt-2 text-sm text-emerald-800">
          Terima kasih. Pesanan anda dijadualkan untuk penghantaran esok selepas
          buah dibuka dan dibungkus segar.
        </p>
        <p className="mt-4 text-sm font-semibold text-emerald-900">
          No. Pesanan: {orderNumber}
        </p>
      </div>

      <div className="mt-5 space-y-3 rounded-xl border border-emerald-200 bg-white p-4">
        <p className="text-sm font-medium text-stone-700">Pautan Jejak Pesanan</p>
        <p className="break-all text-sm text-stone-900">{trackingUrl}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <CopyButton
            text={trackingUrl}
            label="Copy Link"
            copiedLabel="Link Disalin!"
            className="flex-1"
          />
          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Kongsi via WhatsApp
          </a>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-emerald-700">
        Simpan pautan ini untuk semak status pesanan anda.
      </p>
      <input type="hidden" value={orderId} readOnly />
      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={onNewOrder}
          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Buat Tempahan Lagi
        </button>
      </div>
    </div>
  );
}

"use client";

import { formatPrice } from "@/lib/products";
import { MAX_QUANTITY } from "@/lib/validation";
import type { Product, ProductId } from "@/lib/types";

type ProductSelectorProps = {
  products: Product[];
  quantities: Record<ProductId, number>;
  onChangeQuantity: (id: ProductId, quantity: number) => void;
};

export function ProductSelector({
  products,
  quantities,
  onChangeQuantity,
}: ProductSelectorProps) {
  return (
    <div className="grid gap-3">
      {products.map((product) => {
        const quantity = quantities[product.id];
        const deliveryNote =
          product.kind === "single"
            ? "RM5 penghantaran untuk pesanan single pack sahaja (percuma jika ada promo)"
            : "Penghantaran percuma";

        return (
          <div
            key={product.id}
            className={`rounded-2xl border p-4 transition ${
              quantity > 0
                ? "border-amber-500 bg-amber-50 shadow-sm"
                : "border-stone-200 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-stone-900">{product.name}</p>
                <p className="mt-1 text-sm text-stone-600">{product.description}</p>
                <p className="mt-1 text-xs text-stone-500">{deliveryNote}</p>
              </div>
              <p className="shrink-0 text-lg font-bold text-amber-700">
                {formatPrice(product.price)}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-stone-700">Kuantiti</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={`Kurangkan ${product.name}`}
                  onClick={() => onChangeQuantity(product.id, Math.max(0, quantity - 1))}
                  disabled={quantity === 0}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 bg-white text-lg font-bold text-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <span className="min-w-[2rem] text-center text-lg font-bold text-stone-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label={`Tambah ${product.name}`}
                  onClick={() =>
                    onChangeQuantity(
                      product.id,
                      Math.min(MAX_QUANTITY, quantity + 1),
                    )
                  }
                  disabled={quantity >= MAX_QUANTITY}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-500 bg-amber-500 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

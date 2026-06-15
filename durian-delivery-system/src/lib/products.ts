import type { Product, ProductId } from "./types";

export const DELIVERY_FEE = 5;

export const PRODUCTS: Product[] = [
  {
    id: "single-300g",
    name: "Single Pack 300g",
    description: "1 bekas · 300g",
    price: 35,
    kind: "single",
  },
  {
    id: "single-500g",
    name: "Single Pack 500g",
    description: "1 bekas · 500g",
    price: 55,
    kind: "single",
  },
  {
    id: "promo-300g",
    name: "Promo 3 Bekas 300g",
    description: "3 bekas · 300g setiap bekas",
    price: 100,
    kind: "promo",
  },
  {
    id: "promo-500g",
    name: "Promo 3 Bekas 500g",
    description: "3 bekas · 500g setiap bekas",
    price: 150,
    kind: "promo",
  },
];

export const PRODUCT_IDS: ProductId[] = PRODUCTS.map((product) => product.id);

export const EMPTY_QUANTITIES: Record<ProductId, number> = {
  "single-300g": 0,
  "single-500g": 0,
  "promo-300g": 0,
  "promo-500g": 0,
};

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((product) => product.id === id);
}

export function formatPrice(amount: number): string {
  return `RM${amount}`;
}

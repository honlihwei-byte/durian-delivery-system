import { DELIVERY_FEE, getProduct } from "./products";
import type { CartLineInput, OrderPricing, ProductId } from "./types";

export function calculateOrderPricing(lines: CartLineInput[]): OrderPricing {
  const items = lines
    .filter((line) => line.quantity > 0)
    .map((line) => {
      const product = getProduct(line.product_id);
      if (!product) {
        throw new Error(`Invalid product: ${line.product_id}`);
      }

      return {
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        quantity: line.quantity,
        line_subtotal: product.price * line.quantity,
        kind: product.kind,
      };
    });

  const productSubtotal = items.reduce(
    (sum, item) => sum + item.line_subtotal,
    0,
  );
  const hasPromo = items.some((item) => item.kind === "promo");
  const deliveryFee =
    items.length === 0 ? 0 : hasPromo ? 0 : DELIVERY_FEE;
  const totalAmount = productSubtotal + deliveryFee;

  return {
    items: items.map(({ kind: _kind, ...item }) => item),
    productSubtotal,
    deliveryFee,
    totalAmount,
  };
}

export function isValidProductId(value: string): value is ProductId {
  return getProduct(value) !== undefined;
}

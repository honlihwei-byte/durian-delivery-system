export type ProductId =
  | "single-300g"
  | "single-500g"
  | "promo-300g"
  | "promo-500g";

export type ProductKind = "single" | "promo";

export type DeliveryTimeType = "bila_bila_masa" | "masa_pilihan";

export type OrderStatus =
  | "new"
  | "confirmed"
  | "preparing_tomorrow_morning"
  | "packed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type Product = {
  id: ProductId;
  name: string;
  description: string;
  price: number;
  kind: ProductKind;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: ProductId;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_subtotal: number;
};

export type Order = {
  id: string;
  customer_name: string;
  whatsapp_number: string;
  delivery_address: string;
  delivery_date: string;
  delivery_time_type: DeliveryTimeType;
  preferred_delivery_time: string | null;
  notes: string | null;
  product_subtotal: number;
  delivery_fee: number;
  total_amount: number;
  status: OrderStatus;
  payment_method: "cod";
  tracking_token: string;
  tracking_code: string;
  delivery_note: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
};

export type CartLineInput = {
  product_id: ProductId;
  quantity: number;
};

export type CreateOrderInput = {
  customer_name: string;
  whatsapp_number: string;
  delivery_address: string;
  delivery_time_type: DeliveryTimeType;
  preferred_delivery_time?: string;
  notes?: string;
  items: CartLineInput[];
};

export type OrderPricing = {
  items: Array<{
    product_id: ProductId;
    product_name: string;
    unit_price: number;
    quantity: number;
    line_subtotal: number;
  }>;
  productSubtotal: number;
  deliveryFee: number;
  totalAmount: number;
};

export type TrackedOrder = {
  order_number: string;
  status: OrderStatus;
  order_items: Array<{
    product_id: ProductId;
    product_name: string;
    unit_price: number;
    quantity: number;
    line_subtotal: number;
  }>;
  product_subtotal: number;
  delivery_fee: number;
  total_amount: number;
  delivery_date: string;
  delivery_date_raw: string;
  delivery_time_type: DeliveryTimeType;
  delivery_time_note: string;
  delivery_note: string | null;
  customer_notes: string | null;
};

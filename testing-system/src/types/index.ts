export type OrderStatus =
  | "pending"
  | "paid"
  | "preparing"
  | "ready"
  | "completed";

export type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url: string;
  stock: number;
  created_at?: string;
};

export type OrderRow = {
  id: string;
  customer_name: string;
  phone: string;
  car_plate: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  updated_at: string;
  /** Customer tapped “I’m Here” after payment */
  arrived: boolean;
  arrived_at: string | null;
  /** Confirmed at pickup (may match checkout plate) */
  arrival_car_plate: string | null;
  arrival_car_color: string | null;
  arrival_location_note: string | null;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: Pick<Product, "name" | "image_url"> | null;
};

export type CartLine = {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  maxStock: number;
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
};

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "preparing",
  "ready",
  "completed",
];

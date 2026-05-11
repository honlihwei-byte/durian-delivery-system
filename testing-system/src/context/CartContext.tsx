"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartLine, Product } from "@/types";

const STORAGE_KEY = "testing-system-cart";

type CartContextValue = {
  lines: CartLine[];
  addProduct: (product: Product, qty?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeLine: (productId: string) => void;
  clear: () => void;
  itemCount: number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function loadFromStorage(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l) =>
        l &&
        typeof l.productId === "string" &&
        typeof l.quantity === "number" &&
        l.quantity > 0
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(loadFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const addProduct = useCallback((product: Product, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      const nextQty = (existing?.quantity ?? 0) + qty;
      const capped = Math.min(nextQty, Math.max(0, product.stock));
      if (capped <= 0) return prev;
      const line: CartLine = {
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        imageUrl: product.image_url,
        quantity: capped,
        maxStock: product.stock,
      };
      if (existing) {
        return prev.map((l) => (l.productId === product.id ? line : l));
      }
      return [...prev, line];
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setLines((prev) => {
      const line = prev.find((l) => l.productId === productId);
      if (!line) return prev;
      if (quantity <= 0) return prev.filter((l) => l.productId !== productId);
      const capped = Math.min(quantity, line.maxStock);
      return prev.map((l) =>
        l.productId === productId ? { ...l, quantity: capped } : l
      );
    });
  }, []);

  const removeLine = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const itemCount = useMemo(
    () => lines.reduce((n, l) => n + l.quantity, 0),
    [lines]
  );

  const subtotal = useMemo(
    () => lines.reduce((n, l) => n + l.price * l.quantity, 0),
    [lines]
  );

  const value = useMemo(
    () => ({
      lines,
      addProduct,
      setQuantity,
      removeLine,
      clear,
      itemCount,
      subtotal,
    }),
    [
      lines,
      addProduct,
      setQuantity,
      removeLine,
      clear,
      itemCount,
      subtotal,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

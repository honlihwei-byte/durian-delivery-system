import { getProducts } from "@/lib/queries";
import ShopClient from "./ShopClient";

export default async function ShopPage() {
  const products = await getProducts();
  return <ShopClient products={products} />;
}

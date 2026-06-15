drop policy if exists "allow_anon_select_orders" on public.orders;
drop policy if exists "allow_anon_update_orders" on public.orders;
drop policy if exists "allow_anon_select_order_items" on public.order_items;
drop policy if exists "allow_anon_update_order_items" on public.order_items;

create unique index if not exists order_items_order_product_unique
  on public.order_items (order_id, product_id);

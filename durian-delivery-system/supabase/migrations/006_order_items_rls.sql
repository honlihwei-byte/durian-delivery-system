create policy "allow_anon_insert_order_items"
  on public.order_items
  for insert
  to anon
  with check (true);

create policy "allow_anon_select_order_items"
  on public.order_items
  for select
  to anon
  using (true);

create policy "allow_anon_update_order_items"
  on public.order_items
  for update
  to anon
  using (true)
  with check (true);

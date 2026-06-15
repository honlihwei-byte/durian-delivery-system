create policy "allow_anon_insert_orders"
  on public.orders
  for insert
  to anon
  with check (true);

create policy "allow_anon_select_orders"
  on public.orders
  for select
  to anon
  using (true);

create policy "allow_anon_update_orders"
  on public.orders
  for update
  to anon
  using (true)
  with check (true);

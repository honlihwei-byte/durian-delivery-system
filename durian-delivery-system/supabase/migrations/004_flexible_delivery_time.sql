alter table public.orders
  add column if not exists delivery_time_type text,
  add column if not exists preferred_delivery_time text;

update public.orders
set delivery_time_type = coalesce(delivery_time_type, 'bila_bila_masa')
where delivery_time_type is null;

alter table public.orders
  drop constraint if exists orders_delivery_time_slot_check;

alter table public.orders
  drop column if exists delivery_time_slot;

alter table public.orders
  alter column delivery_time_type set not null;

alter table public.orders
  drop constraint if exists orders_delivery_time_type_check;

alter table public.orders
  add constraint orders_delivery_time_type_check
  check (delivery_time_type in ('bila_bila_masa', 'masa_pilihan'));

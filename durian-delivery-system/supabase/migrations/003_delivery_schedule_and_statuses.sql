alter table public.orders
  add column if not exists delivery_date date,
  add column if not exists delivery_time_slot text;

update public.orders
set
  delivery_date = coalesce(
    delivery_date,
    ((created_at at time zone 'Asia/Kuala_Lumpur')::date + 1)
  ),
  delivery_time_slot = coalesce(delivery_time_slot, 'pagi')
where delivery_date is null or delivery_time_slot is null;

alter table public.orders
  alter column delivery_date set not null,
  alter column delivery_time_slot set not null;

alter table public.orders
  drop constraint if exists orders_delivery_day_check;

alter table public.orders
  drop column if exists delivery_day;

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_delivery_time_slot_check
  check (delivery_time_slot in ('pagi', 'tengah_hari', 'petang', 'malam'));

alter table public.orders
  add constraint orders_status_check
  check (
    status in (
      'new',
      'confirmed',
      'preparing_tomorrow_morning',
      'packed',
      'out_for_delivery',
      'delivered'
    )
  );

alter table public.orders
  alter column status set default 'new';

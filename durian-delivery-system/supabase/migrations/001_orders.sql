create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  whatsapp_number text not null,
  delivery_address text not null,
  delivery_day text not null check (delivery_day in ('hari_ini', 'esok')),
  notes text,
  product_id text not null check (product_id in ('bekas-300g', 'bekas-500g')),
  product_name text not null,
  product_price integer not null check (product_price > 0),
  status text not null default 'new' check (
    status in ('new', 'confirmed', 'out_for_delivery', 'delivered')
  ),
  payment_method text not null default 'cod' check (payment_method = 'cod'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_created_at_idx
  on public.orders (status, created_at desc);

create or replace function public.set_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;

create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.set_orders_updated_at();

alter table public.orders enable row level security;

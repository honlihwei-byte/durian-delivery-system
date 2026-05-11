-- Testing System — optional: run in Supabase when you connect the database later.
-- The app currently uses in-memory mock data (see src/lib/mock-store.ts).

create extension if not exists "uuid-ossp";

create type public.order_status as enum (
  'pending',
  'paid',
  'preparing',
  'ready',
  'completed'
);

create table public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  category text not null,
  image_url text not null,
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  customer_name text not null,
  phone text not null,
  car_plate text not null,
  status public.order_status not null default 'pending',
  total numeric(10, 2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0)
);

create index idx_orders_created on public.orders (created_at desc);
create index idx_orders_status on public.orders (status);
create index idx_order_items_order on public.order_items (order_id);

create or replace function public.set_orders_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger orders_updated_at
before update on public.orders
for each row execute function public.set_orders_updated_at();

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Catalog is public read
create policy "products_select_public"
  on public.products for select
  using (true);

-- Orders: only service role (bypasses RLS) from Next server actions
-- No policies for anon/authenticated on orders / order_items = deny by default

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id text not null,
  product_name text not null,
  unit_price integer not null check (unit_price > 0),
  quantity integer not null check (quantity > 0),
  line_subtotal integer not null check (line_subtotal > 0),
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

alter table public.orders
  add column if not exists product_subtotal integer,
  add column if not exists delivery_fee integer not null default 0,
  add column if not exists total_amount integer;

insert into public.order_items (
  order_id,
  product_id,
  product_name,
  unit_price,
  quantity,
  line_subtotal
)
select
  o.id,
  case
    when o.product_id = 'bekas-300g' then 'promo-300g'
    when o.product_id = 'bekas-500g' then 'promo-500g'
    else o.product_id
  end,
  o.product_name,
  o.product_price,
  1,
  o.product_price
from public.orders o
where o.product_id is not null
  and not exists (
    select 1
    from public.order_items oi
    where oi.order_id = o.id
  );

update public.orders o
set product_subtotal = item_totals.amount
from (
  select order_id, sum(line_subtotal) as amount
  from public.order_items
  group by order_id
) item_totals
where o.id = item_totals.order_id
  and o.product_subtotal is null;

update public.orders
set product_subtotal = product_price
where product_subtotal is null
  and product_price is not null;

update public.orders o
set delivery_fee = case
  when exists (
    select 1
    from public.order_items oi
    where oi.order_id = o.id
      and oi.product_id in ('promo-300g', 'promo-500g', 'bekas-300g', 'bekas-500g')
  ) then 0
  when exists (
    select 1 from public.order_items oi where oi.order_id = o.id
  ) then 5
  else 0
end
where o.product_subtotal is not null;

update public.orders
set total_amount = product_subtotal + delivery_fee
where total_amount is null
  and product_subtotal is not null;

update public.orders
set
  product_subtotal = coalesce(product_subtotal, 0),
  total_amount = coalesce(total_amount, 0)
where product_subtotal is null
   or total_amount is null;

alter table public.orders
  drop constraint if exists orders_product_id_check;

alter table public.orders
  drop column if exists product_id,
  drop column if exists product_name,
  drop column if exists product_price;

alter table public.orders
  alter column product_subtotal set not null,
  alter column total_amount set not null;

alter table public.order_items enable row level security;

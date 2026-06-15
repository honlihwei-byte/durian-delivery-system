alter table public.orders
  add column if not exists tracking_token text,
  add column if not exists delivery_note text;

update public.orders
set tracking_token = replace(gen_random_uuid()::text, '-', '')
  || replace(gen_random_uuid()::text, '-', '')
where tracking_token is null;

alter table public.orders
  alter column tracking_token set not null;

create unique index if not exists orders_tracking_token_unique
  on public.orders (tracking_token);

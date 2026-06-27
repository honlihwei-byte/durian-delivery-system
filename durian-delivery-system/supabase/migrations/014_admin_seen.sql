alter table public.orders
  add column if not exists admin_seen boolean not null default false;

-- Existing orders should not appear as unread notifications.
update public.orders
set admin_seen = true
where admin_seen = false;

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (
    status in (
      'new',
      'confirmed',
      'preparing_tomorrow_morning',
      'packed',
      'out_for_delivery',
      'delivered',
      'cancelled'
    )
  );

create or replace function public.protect_tracking_token()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.tracking_token is distinct from old.tracking_token then
    raise exception 'tracking_token cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists orders_protect_tracking_token on public.orders;

create trigger orders_protect_tracking_token
before update on public.orders
for each row
execute function public.protect_tracking_token();

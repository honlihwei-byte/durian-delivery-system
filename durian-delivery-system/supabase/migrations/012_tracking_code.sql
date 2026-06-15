alter table public.orders
  add column if not exists tracking_code text;

do $$
declare
  r record;
  base_code text;
  candidate text;
  suffix integer;
begin
  for r in
    select id
    from public.orders
    where tracking_code is null
    order by created_at
  loop
    base_code :=
      'MK-' || upper(right(replace(r.id::text, '-', ''), 8));
    candidate := base_code;
    suffix := 1;

    while exists (
      select 1
      from public.orders
      where tracking_code = candidate
        and id <> r.id
    ) loop
      suffix := suffix + 1;
      candidate := base_code || suffix::text;
    end loop;

    update public.orders
    set tracking_code = candidate
    where id = r.id;
  end loop;
end;
$$;

alter table public.orders
  alter column tracking_code set not null;

create unique index if not exists orders_tracking_code_unique
  on public.orders (tracking_code);

create or replace function public.set_tracking_code_on_insert()
returns trigger
language plpgsql
as $$
begin
  if new.tracking_code is null then
    new.tracking_code :=
      'MK-' || upper(right(replace(new.id::text, '-', ''), 8));
  end if;

  return new;
end;
$$;

drop trigger if exists orders_set_tracking_code on public.orders;

create trigger orders_set_tracking_code
before insert on public.orders
for each row
execute function public.set_tracking_code_on_insert();

create or replace function public.protect_tracking_identifiers()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if new.tracking_token is distinct from old.tracking_token then
      raise exception 'tracking_token cannot be changed';
    end if;

    if new.tracking_code is distinct from old.tracking_code then
      raise exception 'tracking_code cannot be changed';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_protect_tracking_token on public.orders;
drop trigger if exists orders_protect_tracking_identifiers on public.orders;

create trigger orders_protect_tracking_identifiers
before update on public.orders
for each row
execute function public.protect_tracking_identifiers();

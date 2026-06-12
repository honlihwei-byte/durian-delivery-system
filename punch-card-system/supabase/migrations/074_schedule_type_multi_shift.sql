-- schedule_type column + multi-shift support (drop one-row-per-cell constraint).

alter table public.staff_schedules
  add column if not exists schedule_type text not null default 'SHIFT';

alter table public.staff_schedules
  drop constraint if exists staff_schedules_schedule_type_check;

alter table public.staff_schedules
  add constraint staff_schedules_schedule_type_check
  check (schedule_type in ('SHIFT', 'RD', 'MC', 'AL', 'UL', 'EL', 'NOT_SCHEDULED'));

-- Allow null times for non-shift rows.
alter table public.staff_schedules alter column start_time drop not null;
alter table public.staff_schedules alter column end_time drop not null;

-- Migrate legacy leave codes stored in time columns.
update public.staff_schedules
set
  schedule_type = case
    when upper(trim(coalesce(start_time::text, ''))) in ('NS', 'NOT SCHEDULED', 'NOT_SCHEDULED') then 'NOT_SCHEDULED'
    when upper(trim(coalesce(start_time::text, ''))) = 'RD' or is_off_day = true then 'RD'
    when upper(trim(coalesce(start_time::text, ''))) = 'MC' then 'MC'
    when upper(trim(coalesce(start_time::text, ''))) = 'AL' then 'AL'
    when upper(trim(coalesce(start_time::text, ''))) = 'UL' then 'UL'
    when upper(trim(coalesce(start_time::text, ''))) = 'EL' then 'EL'
    else 'SHIFT'
  end,
  start_time = case
    when upper(trim(coalesce(start_time::text, ''))) ~ '^[A-Z ]+$'
      and upper(trim(coalesce(start_time::text, ''))) not similar to '[0-9]%'
    then null
    else start_time
  end,
  end_time = case
    when upper(trim(coalesce(end_time::text, ''))) ~ '^[A-Z ]+$'
      and upper(trim(coalesce(end_time::text, ''))) not similar to '[0-9]%'
    then null
    else end_time
  end
where status = 'active';

update public.staff_schedules
set is_off_day = (schedule_type <> 'SHIFT')
where status = 'active';

-- Drop index that enforced only one active row per staff/shop/date.
drop index if exists public.staff_schedules_one_active_per_cell_idx;

-- One non-shift status per cell.
create unique index if not exists staff_schedules_one_status_per_cell_idx
  on public.staff_schedules (company_id, staff_id, shop_id, shift_date)
  where status = 'active' and schedule_type <> 'SHIFT';

-- Multiple SHIFT rows per cell via sequence_no.
create unique index if not exists staff_schedules_shift_sequence_idx
  on public.staff_schedules (company_id, staff_id, shop_id, shift_date, sequence_no)
  where status = 'active' and schedule_type = 'SHIFT';

alter table public.staff_schedules
  drop constraint if exists staff_schedules_type_times_check;

alter table public.staff_schedules
  add constraint staff_schedules_type_times_check
  check (
    (schedule_type = 'SHIFT' and start_time is not null and end_time is not null)
    or (schedule_type <> 'SHIFT' and start_time is null and end_time is null)
  );

comment on column public.staff_schedules.schedule_type is
  'SHIFT = timed shift; RD/MC/AL/UL/EL/NOT_SCHEDULED = non-working day status (no times).';

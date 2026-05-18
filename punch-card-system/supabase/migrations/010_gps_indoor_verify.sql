-- Indoor / high-rise GPS verification audit fields.

alter table public.shops
  add column if not exists gps_indoor_mode boolean not null default false;

comment on column public.shops.gps_indoor_mode is
  'When true, use lenient indoor radius rules for all GPS points at this shop.';

alter table public.attendance
  add column if not exists gps_verify_tier text
    check (gps_verify_tier in ('verified', 'weak_indoor', 'rejected', 'review_required')),
  add column if not exists gps_sample_count integer,
  add column if not exists gps_sample_spread_meters double precision,
  add column if not exists gps_indoor_session_used boolean not null default false,
  add column if not exists gps_review_required boolean not null default false;

comment on column public.attendance.gps_verify_tier is
  'verified | weak_indoor | rejected | review_required — admin GPS status label.';
comment on column public.attendance.gps_sample_count is 'Number of GPS samples aggregated at punch.';
comment on column public.attendance.gps_sample_spread_meters is 'Max spread (m) between samples at punch.';
comment on column public.attendance.gps_indoor_session_used is
  'True when punch used short-term remembered indoor location grace.';
comment on column public.attendance.gps_review_required is
  'True when admin should review borderline GPS punch.';

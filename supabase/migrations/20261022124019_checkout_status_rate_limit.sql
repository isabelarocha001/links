-- Shared, per-transaction/IP rate limit for the public payment status endpoint.
create schema if not exists checkout_private;
revoke all on schema checkout_private from public, anon, authenticated;
grant usage on schema checkout_private to service_role;

create table if not exists checkout_private.checkout_status_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null,
  attempts integer not null check (attempts >= 1),
  updated_at timestamptz not null
);

create index if not exists checkout_status_rate_limits_updated_at_idx
  on checkout_private.checkout_status_rate_limits (updated_at);

create table if not exists checkout_private.checkout_status_rate_limit_gc (
  singleton boolean primary key default true check (singleton),
  last_cleanup_at timestamptz not null
);
insert into checkout_private.checkout_status_rate_limit_gc (singleton, last_cleanup_at)
values (true, '-infinity'::timestamptz)
on conflict (singleton) do nothing;
alter table checkout_private.checkout_status_rate_limit_gc enable row level security;
revoke all on table checkout_private.checkout_status_rate_limit_gc from public, anon, authenticated, service_role;

alter table checkout_private.checkout_status_rate_limits enable row level security;
revoke all on table checkout_private.checkout_status_rate_limits from public, anon, authenticated, service_role;

create or replace function public.consume_checkout_status_attempt(
  p_payment_id text,
  p_client_ip text
)
returns table (allowed boolean, attempts integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_key text;
  v_window_started_at timestamptz;
  v_attempts integer;
begin
  if p_payment_id is null or length(p_payment_id) > 160
     or p_client_ip is null or length(p_client_ip) > 128 then
    raise exception 'invalid rate limit key';
  end if;

  -- Store only a digest, not the payment ID or IP address.
  v_key := md5(p_payment_id || ':' || p_client_ip);

  insert into checkout_private.checkout_status_rate_limits as current_limit
    (rate_key, window_started_at, attempts, updated_at)
  values (v_key, v_now, 1, v_now)
  on conflict (rate_key) do update set
    window_started_at = case
      when current_limit.window_started_at <= v_now - interval '1 minute' then v_now
      else current_limit.window_started_at
    end,
    attempts = case
      when current_limit.window_started_at <= v_now - interval '1 minute' then 1
      else current_limit.attempts + 1
    end,
    updated_at = v_now
  returning current_limit.window_started_at, current_limit.attempts
  into v_window_started_at, v_attempts;

  -- Opportunistically remove old keys once every five minutes.
  update checkout_private.checkout_status_rate_limit_gc
  set last_cleanup_at = v_now
  where singleton = true and last_cleanup_at < v_now - interval '5 minutes';
  if found then
    delete from checkout_private.checkout_status_rate_limits
    where updated_at < v_now - interval '1 day';
  end if;

  return query select
    v_attempts <= 5,
    v_attempts,
    greatest(1, ceil(extract(epoch from (v_window_started_at + interval '1 minute' - v_now)))::integer);
end;
$$;

revoke all on function public.consume_checkout_status_attempt(text, text) from public, anon, authenticated;
grant execute on function public.consume_checkout_status_attempt(text, text) to service_role;

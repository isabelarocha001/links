create table if not exists public.tracking_events (
  id bigint generated always as identity primary key,
  visitor_id text not null check (char_length(visitor_id) between 8 and 64),
  event_name text not null check (char_length(event_name) between 1 and 40),
  occurred_at timestamptz not null default now(),
  path text not null default '/',
  offer_slug text not null default 'wanessa_links',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  src text,
  sck text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists tracking_events_occurred_at_idx
  on public.tracking_events (occurred_at desc);
create index if not exists tracking_events_event_occurred_idx
  on public.tracking_events (event_name, occurred_at desc);
create index if not exists tracking_events_visitor_idx
  on public.tracking_events (visitor_id, occurred_at desc);

alter table public.tracking_events enable row level security;
revoke all on public.tracking_events from anon, authenticated;
grant insert on public.tracking_events to anon, authenticated;
grant usage, select on sequence public.tracking_events_id_seq to anon, authenticated;

drop policy if exists "Public analytics inserts only" on public.tracking_events;
create policy "Public analytics inserts only"
  on public.tracking_events for insert to anon, authenticated
  with check (true);

comment on table public.tracking_events is
  'Analytics events for Wanessa links site, isolated from the application database.';

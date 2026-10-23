create table if not exists public.analytics_webhook_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  event_id text,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  constraint analytics_webhook_events_source_length check (char_length(source) between 1 and 80),
  constraint analytics_webhook_events_event_type_length check (char_length(event_type) between 1 and 120),
  constraint analytics_webhook_events_event_id_length check (event_id is null or char_length(event_id) <= 200)
);

create unique index if not exists analytics_webhook_events_source_event_id_uidx
  on public.analytics_webhook_events (source, event_id);

create index if not exists analytics_webhook_events_received_at_idx
  on public.analytics_webhook_events (received_at desc);

alter table public.analytics_webhook_events enable row level security;
revoke all on table public.analytics_webhook_events from public, anon, authenticated;
grant select, insert on table public.analytics_webhook_events to service_role;

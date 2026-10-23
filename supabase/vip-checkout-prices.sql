-- Execute no SQL Editor do Supabase do projeto usado pelo site de links.
-- A tabela app_secrets já é usada pelo backend como chave/valor.
insert into public.app_secrets (key, value)
values
  ('VIP_MONTHLY_PRICE_BRL', '29.90'),
  ('VIP_SIX_MONTH_PRICE_BRL', '59.90'),
  ('VIP_LIFETIME_PRICE_BRL', '109.90')
on conflict (key) do update
set value = excluded.value;

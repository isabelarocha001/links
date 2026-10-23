# Preços do checkout VIP

Os preços do checkout vêm do Supabase, pela tabela `public.app_secrets`. O servidor lê somente as chaves necessárias e devolve os valores públicos à página; a chave de serviço e as demais entradas nunca são enviadas ao navegador.

| Chave | Valor inicial | Plano |
| --- | ---: | --- |
| `VIP_MONTHLY_PRICE_BRL` | `29.90` | Pix Automático mensal, a cada 30 dias |
| `VIP_SIX_MONTH_PRICE_BRL` | `59.90` | Pix Automático, a cada 180 dias |
| `VIP_LIFETIME_PRICE_BRL` | `109.90` | Acesso vitalício, sem recorrência |

Para cadastrar ou atualizar os valores, execute [`../supabase/vip-checkout-prices.sql`](../supabase/vip-checkout-prices.sql) no SQL Editor do projeto Supabase usado pelo site de links.

O backend usa esses mesmos valores ao criar pagamentos. Os planos mensal e de seis meses são comparados com o valor e o ciclo dos planos Pix Automático cadastrados na SyncPay. Se os valores divergirem, o checkout correspondente fica indisponível em vez de cobrar um valor diferente do exibido. O vitalício é cobrado uma vez.

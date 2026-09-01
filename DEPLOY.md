# Deploy — vocationiq.app

Decisões já tomadas: mesmo projecto Supabase da Naveya, mesma conta Stripe da Naveya, backoffice da Naveya serve para já (não há admin próprio do VocationIQ). Este ficheiro é o guião passo a passo — nenhum destes passos foi executado por mim, porque todos envolvem dinheiro real ou infra-estrutura partilhada.

## 1. Supabase — correr a migração

Abre o dashboard do projecto Supabase da Naveya → **SQL Editor** → **New query** → cola o conteúdo de [`web/supabase/migrations/0001_vocationiq_intakes.sql`](web/supabase/migrations/0001_vocationiq_intakes.sql) → **Run**.

A tabela chama-se `vocationiq_intakes`, prefixo próprio — não colide com nenhuma tabela existente da Naveya. É segura para correr num projecto partilhado: usa `CREATE TABLE IF NOT EXISTS`, não altera nem apaga nada que já existe.

## 2. Stripe — criar o produto

No teu terminal (PowerShell), a partir de `web/`:

```powershell
cd "C:\Users\Rui Vaz\OneDrive\Ambiente de Trabalho\vocationiq\web"
$env:STRIPE_SECRET_KEY = "sk_live_...a tua chave secreta da Naveya..."
npx tsx scripts/create-stripe-product.ts
```

Isto cria o produto **"VocationIQ — Análise Personalizada"** (€99, pagamento único, EUR) na conta Stripe da Naveya e imprime um `STRIPE_PRICE_ID` (algo como `price_1AbC...`).

**Diz-me esse Price ID quando o tiveres** — preciso dele só para confirmar que o checkout está a apontar para o preço certo; não preciso de ver a tua chave secreta.

Depois, no dashboard da Stripe → **Webhooks** → **Add endpoint**:
- URL: `https://vocationiq.app/api/stripe/webhook`
- Evento a escutar: `checkout.session.completed`
- Copia o **Signing secret** (`whsec_...`) — é o `STRIPE_WEBHOOK_SECRET` da lista abaixo.

(Só consegues adicionar o endpoint depois do domínio estar a responder no Vercel — passo 3 primeiro, isto depois.)

## 3. Vercel — variáveis de ambiente

No projecto Vercel do vocationiq, **Root Directory = `web`** (o repositório é um monorepo `method-engine/` + `web/`, tal como o da Naveya).

Variáveis a configurar (Project → Settings → Environment Variables):

| Nome | Valor | Onde vem |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://vocationiq.app` | fixo |
| `STRIPE_SECRET_KEY` | a chave secreta da Naveya | a mesma que usaste no passo 2 |
| `STRIPE_PRICE_ID` | `price_...` | output do passo 2 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | do endpoint criado no passo 2 (depois do deploy) |
| `SUPABASE_URL` | a URL do projecto Supabase da Naveya | Naveya → Vercel → Environment Variables (já lá está, com este nome ou `NEXT_PUBLIC_SUPABASE_URL`) |
| `SUPABASE_SERVICE_ROLE_KEY` | a service role key do projecto Supabase da Naveya | idem |
| `RESEND_API_KEY` | a chave Resend da Naveya | Naveya → Vercel → Environment Variables |
| `ADMIN_PASSWORD` | a tua escolha | protege `/admin` — pode ser igual ou diferente da password da Naveya, são cookies de sessão separados |

Nota sobre `STRIPE_WEBHOOK_SECRET`: só existe depois de criares o endpoint no passo 2, que só podes criar depois do domínio estar a responder — por isso a sequência é: deploy inicial sem essa variável (o site funciona à mesma, só a rota do webhook fica inactiva até lá) → cria o endpoint na Stripe → adiciona a variável → faz **redeploy** (variáveis de ambiente só entram em vigor depois de um novo deploy).

## 4. Cloudflare — DNS para vocationiq.app

Depois do deploy no Vercel:

1. No Vercel: Project → Settings → **Domains** → adiciona `vocationiq.app` (e opcionalmente `www.vocationiq.app`). O Vercel mostra ali os registos DNS exactos a criar — são estes os valores autorizados a seguir, os que descrevo abaixo são os valores-padrão actuais do Vercel e servem para confirmares que bate certo.
2. Na Cloudflare, no separador **DNS** do domínio `vocationiq.app`, adiciona:
   - Para o domínio raiz (`vocationiq.app`): registo **A**, nome `@`, valor `76.76.21.21`.
   - Para `www` (se quiseres `www.vocationiq.app` a funcionar também): registo **CNAME**, nome `www`, valor `cname.vercel-dns.com`.
3. **Importante**: em ambos os registos, o **Proxy status** tem de ficar em **"DNS only"** (nuvem cinzenta, não laranja). Se ficar "Proxied" (laranja), o Cloudflare tenta fazer SSL/proxy por cima do Vercel e o domínio não valida correctamente.
4. Espera a propagação (normalmente minutos, pode ir a algumas horas) e confirma que `https://vocationiq.app` mostra o site.

## Ordem recomendada

1. Supabase (passo 1) — pode ser feito já, sem depender de mais nada.
2. Vercel: deploy inicial com as variáveis que já tens (Stripe secret key, Supabase, Resend) — sem `STRIPE_PRICE_ID` nem `STRIPE_WEBHOOK_SECRET` ainda, o checkout usa um preço criado em runtime como fallback.
3. Stripe (passo 2) — cria o produto, adiciona o Price ID ao Vercel, redeploy.
4. Cloudflare (passo 4) — liga o domínio.
5. Stripe webhook — agora que `vocationiq.app` responde, cria o endpoint, adiciona o `STRIPE_WEBHOOK_SECRET` ao Vercel, redeploy final.

## Confirmação

Depois de tudo: `https://vocationiq.app` mostra a homepage, `/intake` leva a um pagamento Stripe real, e o webhook marca o pedido como pago e envia o email de confirmação. Diz-me quando chegares aqui e eu verifico o fluxo ponta-a-ponta (sem tocar em dinheiro real — só a olhar para o código e, se quiseres, para um pagamento de teste).

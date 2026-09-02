# Deploy — vocationiq.app

Decisões já tomadas: mesmo projecto Supabase da Naveya, mesma conta Stripe da Naveya. O VocationIQ tem agora o seu próprio backoffice completo em `/admin` (dashboard, pedidos, analytics, comerciais) — já não depende do admin da Naveya. Este ficheiro é o guião passo a passo — nenhum destes passos foi executado por mim, porque todos envolvem dinheiro real ou infra-estrutura partilhada.

## 1. Supabase — correr as migrações

Abre o dashboard do projecto Supabase da Naveya → **SQL Editor** → **New query** → cola o conteúdo de cada ficheiro, por ordem, e corre um de cada vez:

1. [`web/supabase/migrations/0001_vocationiq_intakes.sql`](web/supabase/migrations/0001_vocationiq_intakes.sql) — tabela dos pedidos.
2. [`web/supabase/migrations/0002_viq_comercial_analytics.sql`](web/supabase/migrations/0002_viq_comercial_analytics.sql) — comerciais, comissões, eventos de funil, relatórios entregues, e o bucket de storage `viq-relatorios` para os PDFs.
3. [`web/supabase/migrations/0003_viq_backoffice_extra.sql`](web/supabase/migrations/0003_viq_backoffice_extra.sql) — testemunhos e influencers.
4. [`web/supabase/migrations/0004_vocationiq_intakes_expandir.sql`](web/supabase/migrations/0004_vocationiq_intakes_expandir.sql) — colunas novas do formulário de intake multi-passo. **Nota**: acrescenta colunas a `vocationiq_intakes`, não a "viq_intakes" — essa tabela nunca existiu, "viq_" só é o prefixo das tabelas criadas a partir da migração 0002.
5. [`web/supabase/migrations/0005_viq_leads.sql`](web/supabase/migrations/0005_viq_leads.sql) — leads do lead magnet da homepage.
6. [`web/supabase/migrations/0006_viq_revisoes.sql`](web/supabase/migrations/0006_viq_revisoes.sql) — produto VocationIQ Revisão (€49): tabela `viq_revisoes` + duas colunas novas em `vocationiq_intakes` (`revisao_email_enviado`, `revisao_email_180_enviado`).
7. [`web/supabase/migrations/0007_viq_testemunhos_avaliacoes.sql`](web/supabase/migrations/0007_viq_testemunhos_avaliacoes.sql) — sistema de avaliações com estrelas: acrescenta `intake_id`, `nota`, `autoriza_publicacao`, `publicavel` a `viq_testemunhos` (já criada na migração 0003), e substitui o CHECK de `situacao` pela taxonomia pública nova (estudante/jovem-adulto/adulto-transicao/prefiro-nao-dizer), diferente da taxonomia do formulário de intake.
8. [`web/supabase/migrations/0008_vocationiq_intakes_adultos.sql`](web/supabase/migrations/0008_vocationiq_intakes_adultos.sql) — perguntas novas do ramo "Já trabalho e quero mudar": `tipo_mudanca` (array), `areas_destino` (array), `areas_destino_outra`, `ideia_concreta`, todas opcionais em `vocationiq_intakes`.

Todas as tabelas novas usam prefixo próprio (`vocationiq_`, `viq_`) — nenhuma colide com nada existente da Naveya. Todas as migrações são seguras para correr num projecto partilhado: usam `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, não alteram nem apagam nada que já existe. "Clientes" (`/admin/clientes`) não tem tabela própria — é agregado a partir de `vocationiq_intakes`.

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

Repete para o segundo produto:

```powershell
npx tsx scripts/create-stripe-revisao-product.ts
```

Cria **"VocationIQ Revisão"** (€49) e imprime um `STRIPE_REVISAO_PRICE_ID`. Mesmo webhook — não precisas de criar outro endpoint na Stripe, o `/api/stripe/webhook` já trata os dois produtos (distingue pelo metadata da sessão).

## 3. Vercel — variáveis de ambiente

No projecto Vercel do vocationiq, **Root Directory = `web`** (o repositório é um monorepo `method-engine/` + `web/`, tal como o da Naveya).

Variáveis a configurar (Project → Settings → Environment Variables):

| Nome | Valor | Onde vem |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://vocationiq.app` | fixo |
| `STRIPE_SECRET_KEY` | a chave secreta da Naveya | a mesma que usaste no passo 2 |
| `STRIPE_PRICE_ID` | `price_...` | output do passo 2 |
| `STRIPE_REVISAO_PRICE_ID` | `price_...` | output do passo 2 (produto Revisão) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | do endpoint criado no passo 2 (depois do deploy) |
| `SUPABASE_URL` | a URL do projecto Supabase da Naveya | Naveya → Vercel → Environment Variables (já lá está, com este nome ou `NEXT_PUBLIC_SUPABASE_URL`) |
| `SUPABASE_SERVICE_ROLE_KEY` | a service role key do projecto Supabase da Naveya | idem |
| `RESEND_API_KEY` | a chave Resend da Naveya | Naveya → Vercel → Environment Variables |
| `ADMIN_PASSWORD` | a tua escolha | protege `/admin` — pode ser igual ou diferente da password da Naveya, são cookies de sessão separados |
| `COMERCIAL_TOKEN_SECRET` | uma string longa e aleatória (ex.: `openssl rand -hex 32`) | assina os tokens de magic link/sessão do painel de comerciais em `/comercial` |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | id do projecto Clarity | pode ser o mesmo da Naveya ou um novo — dashboard.clarity.microsoft.com |
| `VERCEL_API_TOKEN` | opcional — token gerado em vercel.com/account/tokens | só para as "métricas básicas" em `/admin/trafego`; sem isto a página só mostra o link da Clarity |
| `VERCEL_PROJECT_ID` | opcional — Project Settings → General, no Vercel | idem |
| `VERCEL_TEAM_ID` | opcional | só se o projecto Vercel pertencer a uma equipa |
| `CRON_SECRET` | uma string longa e aleatória (ex.: `openssl rand -hex 32`) | protege `/api/cron/revisao-emails` — o Vercel envia-a automaticamente como `Authorization: Bearer` quando o cron corre, sem mais nada a configurar |

Nota sobre `/admin/trafego`: a integração com a API de Web Analytics da Vercel não foi testada de ponta a ponta nesta sessão (não tenho um `VERCEL_API_TOKEN` aqui) — o parsing é defensivo e nunca deve rebentar a página, mas confirma que os números batem certo assim que configurares as variáveis.

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

## VocationIQ Revisão — cron diário

`web/vercel.json` já regista o cron (`/api/cron/revisao-emails`, todos os dias às 9h) — o Vercel lê este ficheiro automaticamente no deploy, não precisas de configurar nada à parte no dashboard, só garantir que `CRON_SECRET` está definido (passo 3). Podes testar manualmente com:

```bash
curl -H "Authorization: Bearer O_TEU_CRON_SECRET" https://vocationiq.app/api/cron/revisao-emails
```

# VocationIQ

Produto independente da Naveya — análise vocacional personalizada (€99, entrega em 48h).
Reutiliza o `method-engine` da Naveya (cópia local em `method-engine/`, sincronizada manualmente — ver nota abaixo) e a mesma infraestrutura de pagamento (Stripe) e de email (Resend).

## Estrutura

- `web/` — site público (Next.js 14, TypeScript, Tailwind CSS)
- `method-engine/` — motor de cálculo (cópia local do `@naveya/method-engine` da Naveya, sem alterações)

## Desenvolvimento

```bash
npm install
npm run dev --workspace=web
```

## Variáveis de ambiente (`web/.env.local`)

Ver `web/.env.local.example`.

## Nota — `method-engine`

Este pacote é uma cópia local, não um symlink nem uma dependência publicada — porque o Vercel só tem acesso ao conteúdo deste repositório no build (um symlink ou `file:../naveya/method-engine` para fora do repo não funcionaria em produção). Actualizações ao `method-engine` da Naveya não se propagam automaticamente aqui; se o motor da Naveya mudar, é preciso copiar de novo.

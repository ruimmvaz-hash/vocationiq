# Suite de regressão contra clientes reais

Item 7 do plano da auditoria de erros (Set 2026). Objectivo: nunca mais corrigir um caso e partir outro sem se dar conta — o padrão que se repetiu nos últimos 4 meses (Melina TAREFA #38 reaberta, Vénus do Miguel removido e depois restaurado, "regeneração Alexandra 3", pergunta específica ignorada no ramo adolescente).

## O que faz

Recalcula as candidatas do catálogo vocacional (motor real, sem chamar a Anthropic) para 5 clientes reais — Rui, Melina, Nádia (ramo adulto) e Alexandra, Miguel (ramo adolescente) — e compara contra uma baseline gravada (`web/scripts/regressao/baseline.json`). Falha alto (código de saída ≠0, lista exactamente o quê) se alguma candidata que estava na baseline **desaparecer** ou **perder nível de confiança**. Uma candidata nova a aparecer, ou a subir de confiança, nunca é falha — só perder é.

## Quando correr

**Sempre que uma alteração tocar** `catalogoVocacional.ts`, `promptAdulto.ts`, `promptAdolescente.ts` ou `relatorioAdultoCompute.ts` — antes de fazer commit:

```bash
cd web
npm run regressao
```

Sai limpo (código 0) = nada da baseline se perdeu, seguro para commitar. Sai com erro = lê a lista, decide se é uma correcção deliberada (ex.: "Melina deixa de ter Direito, decisão do especialista" — like a47a8f7) ou um efeito colateral não intencional.

## Gate automático (CI)

Desde 21 Set corre também sozinho, sem intervenção, em `.github/workflows/regressao.yml` — em cada push e cada pull request para `master` (e manualmente via "Run workflow" no GitHub Actions). Não precisa de nenhum segredo/API key: nunca geocodifica (coordenadas fixas por fixture) nem chama a Anthropic.

**Ajustado no mesmo dia (2ª ronda) — deixou de bloquear/notificar por email:** a baseline actual já tem os diffs conhecidos e deliberadamente não resolvidos da Melina e da Nádia (pedido explícito do Rui de não recapturar até validar o PDF da Nádia), o que fazia a suite falhar em TODO o push — e cada falha disparava um email do GitHub Actions por run (2 emails em 2 horas, reportado pelo Rui). O passo tem agora `continue-on-error: true`: a run aparece na aba Actions com um aviso (`::warning::`) sempre que a suite falhar, mas já não marca o workflow como falhado nem dispara email. **Isto é temporário** — assim que a baseline da Melina/Nádia for revista e recapturada (e o Miguel tiver a sua própria), remover o `continue-on-error` do workflow para voltar a ser um gate a sério (bloqueia + notifica).

## Quando actualizar a baseline

**Só depois de reveres e aprovares a mudança como correcta** — nunca automaticamente, nunca só para fazer o gate passar:

```bash
cd web
npm run regressao:baseline
```

Isto sobrescreve `baseline.json` com o estado actual. Commita o `baseline.json` novo junto com a alteração que o justifica, para o histórico do git mostrar as duas coisas juntas.

## Lacunas conhecidas — não preencher com dados inventados

- **Miguel** — adicionado a `web/scripts/regressao/fixtures.ts` em 21 Set, com dados de nascimento reais (07/09/2010, 18:00, Lisboa). Só o nascimento é real e conhecido nesta ronda — sem clareza_ideia/áreas consideradas/preferência da família reais disponíveis, por isso esses campos ficam por preencher. Ainda **sem baseline capturada** (`npm run regressao` mostra "SEM BASELINE — a saltar" para ele) — falta correr `npm run regressao:baseline` e reveres o resultado como correcto antes de ele entrar no gate a sério. Como `capturar-baseline.ts` recaptura TODOS os clientes de uma vez, isso só pode ser feito depois de resolvida a baseline pendente da Melina/Nádia (ou adaptando o script para recapturar só um cliente).
- **João** — nunca teve dados de nascimento reais disponíveis neste repositório (confirmado no próprio commit `a47a8f7`: "sem dados de nascimento disponíveis, marcado como pendente"). O script `test-relatorio-joao-adolescente.ts` usa dados sintéticos — não serve para esta suite.

Adicionar dados de nascimento reais do João só com birth data real pedido directamente ao Rui — nunca com uma data inventada só para ter mais uma linha na suite.

## Porque as coordenadas estão fixas no código (`fixtures.ts`)

Este ambiente de execução (sandbox onde as correcções de hoje foram desenvolvidas) não tem acesso de rede à API de geocodificação (Open-Meteo) — por isso cada fixture tem `coordenadas` fixas em vez de deixar o motor geocodificar o "Local de nascimento" em texto livre. É o mesmo mecanismo que a produção usa para nunca regeocodificar duas vezes (`viq_relatorios.coordenadas_nascimento`), aqui aplicado por necessidade técnica. Em produção normal, com acesso à internet, isto não é preciso.

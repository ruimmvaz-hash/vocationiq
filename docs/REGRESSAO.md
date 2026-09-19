# Suite de regressão contra clientes reais

Item 7 do plano da auditoria de erros (Set 2026). Objectivo: nunca mais corrigir um caso e partir outro sem se dar conta — o padrão que se repetiu nos últimos 4 meses (Melina TAREFA #38 reaberta, Vénus do Miguel removido e depois restaurado, "regeneração Alexandra 3", pergunta específica ignorada no ramo adolescente).

## O que faz

Recalcula as candidatas do catálogo vocacional (motor real, sem chamar a Anthropic) para 4 clientes reais — Rui, Melina, Nádia (ramo adulto) e Alexandra (ramo adolescente) — e compara contra uma baseline gravada (`web/scripts/regressao/baseline.json`). Falha alto (código de saída ≠0, lista exactamente o quê) se alguma candidata que estava na baseline **desaparecer** ou **perder nível de confiança**. Uma candidata nova a aparecer, ou a subir de confiança, nunca é falha — só perder é.

## Quando correr

**Sempre que uma alteração tocar** `catalogoVocacional.ts`, `promptAdulto.ts`, `promptAdolescente.ts` ou `relatorioAdultoCompute.ts` — antes de fazer commit:

```bash
cd web
npm run regressao
```

Sai limpo (código 0) = nada da baseline se perdeu, seguro para commitar. Sai com erro = lê a lista, decide se é uma correcção deliberada (ex.: "Melina deixa de ter Direito, decisão do especialista" — like a47a8f7) ou um efeito colateral não intencional.

## Quando actualizar a baseline

**Só depois de reveres e aprovares a mudança como correcta** — nunca automaticamente, nunca só para fazer o gate passar:

```bash
cd web
npm run regressao:baseline
```

Isto sobrescreve `baseline.json` com o estado actual. Commita o `baseline.json` novo junto com a alteração que o justifica, para o histórico do git mostrar as duas coisas juntas.

## Lacunas conhecidas — não preencher com dados inventados

- **Miguel** — dados reais usados numa ronda anterior (commit `a47a8f7`), nunca commitados num script permanente. Falta adicionar `web/scripts/regressao/fixtures.ts` com o birth data real dele.
- **João** — nunca teve dados de nascimento reais disponíveis neste repositório (confirmado no próprio commit `a47a8f7`: "sem dados de nascimento disponíveis, marcado como pendente"). O script `test-relatorio-joao-adolescente.ts` usa dados sintéticos — não serve para esta suite.

Adicionar qualquer um dos dois só com birth data real pedido directamente ao Rui — nunca com uma data inventada só para ter mais uma linha na suite.

## Porque as coordenadas estão fixas no código (`fixtures.ts`)

Este ambiente de execução (sandbox onde as correcções de hoje foram desenvolvidas) não tem acesso de rede à API de geocodificação (Open-Meteo) — por isso cada fixture tem `coordenadas` fixas em vez de deixar o motor geocodificar o "Local de nascimento" em texto livre. É o mesmo mecanismo que a produção usa para nunca regeocodificar duas vezes (`viq_relatorios.coordenadas_nascimento`), aqui aplicado por necessidade técnica. Em produção normal, com acesso à internet, isto não é preciso.

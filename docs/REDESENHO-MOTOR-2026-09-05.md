# Redesenho completo do motor VocationIQ — relatório final

**Data:** 2026-09-05. **Âmbito:** Partes 1-6 do pedido, implementadas e testadas nesta ordem, cada uma verificada antes de avançar para a seguinte.

---

## Parte 1 — cálculos corrigidos

### 1A · Neecha Bhanga Raja Yoga
Implementado em [`method-engine/src/vocationiq/pesosPlanetas.ts`](../method-engine/src/vocationiq/pesosPlanetas.ts) — `detectarNeechaBhanga()` verifica as 3 condições clássicas pedidas (regente do signo de debilidade exaltado/próprio; planeta que seria exaltado no mesmo signo em Kendra do Ascendente/Lua; regente da exaltação do próprio planeta em Kendra do Ascendente). Quando detectado, o estado passa de `"Debilitated"` para `"NeechaBhanga"` (peso 1,2 em vez de 0,6), com nota técnica citando a condição exacta.

Já existia uma detecção "Neechabhanga" mais simples em `lifeReport/yogas.ts`, partilhada com o Life Report principal da Naveya — não foi alterada (evita risco no outro produto); a nova função é própria do VocationIQ.

**Testado:** 6 testes unitários novos (`method-engine/test/neechaBhanga.test.ts`), um por condição + os casos "sem debilidade" e "debilidade sem cancelação".

### 1B · Modo de Ganho com força real
`computeEarningModes()` (em `method-engine/src/lifeReport/vocationIQ.ts`) agora aceita os pesos já calculados e soma a pontuação pedida: +1,0/+0,5/-0,5 por planeta ocupante consoante o peso, +0,5/+0,25 pelo regente da casa. Como os pesos já vêm corrigidos pela Neecha Bhanga, o Modo de Ganho herda a correcção automaticamente.

### 1C · Roda da Vida, nova fórmula
`valor = (SAV_da_casa / SAV_max) × 6 + soma(peso de cada planeta presente na casa) × 0,67`, normalizado e capado a [0,10]. Substitui a versão anterior (só SAV), que podia mostrar "carreira 2,9/10" mesmo com um planeta forte na casa 10.

### 1D · Dados mais ricos
- SAV das 12 casas — já existia (`computeSavPorCasa` sempre devolveu as 12).
- Elementos por planeta e classificação da Mahadasha — novos, em `promptAdulto.ts` (`ELEMENTO_PLANETA`, `MAHADASHA_CLASSIFICACAO`).
- Cadeia de regência (regente da casa do Atmakaraka, regente da casa do Karakamsha) — novo campo em `VocationIQAxes.missionAxis`.

### Verificação com dados reais
Encontrei a carta real da Melina já usada como fixture noutro teste do repositório (`method-engine/test/orquestrador.test.ts` — São Paulo, 11/12/1984, 08:30 local). Corri o pipeline novo contra ela:
- **Atmakaraka = Saturno** — bate certo com o facto documentado em `SPEC-vocacional.md` ("Saturno, que é a peça mais forte da carta").
- Sequência de SAV por casa (22·26·22·30·34·26·22·30·32·36·34·23) bate exactamente com a sequência já verificada contra o Prokerala noutro teste existente (`sarvashtakavarga.test.ts`).

Isto dá confiança de que a base de cálculo estava correcta antes do redesenho, e que as correcções assentam em cima dela sem a desviar.

---

## Parte 2 — catálogo vocacional integrado

Ficheiros copiados para `method-engine/src/data/vocacional/` (183 destinos + índices por planeta/nakshatra/combinação/inverso + raridade + as 3 specs). `catalogarDestinos()` em [`catalogoVocacional.ts`](../method-engine/src/vocationiq/catalogoVocacional.ts).

### Achado importante durante o teste
A primeira versão reproduziu **exactamente** o bug que motivou toda a `SPEC-vocacional.md`: para a carta da Melina, "Direito" surgia como candidata fora da lista com 4 camadas (Amatyakaraka, Nakshatra, uma combinação, área tabelada) — **sem nenhuma vir do Atmakaraka** (Saturno). O mesmo padrão "ganha por ser comum, não por ser dela" que o documento denuncia.

**Correcção aplicada:** a candidata fora da lista só é válida se, além de ≥4 camadas, uma delas vier do Atmakaraka. Depois da correcção, para "Estética"/"Gestora"/"Contabilidade" na carta da Melina, o resultado passou a ser honestamente "nenhuma" — resposta válida segundo a própria spec ("a tua carta não aponta a nada fora do que já pensaste").

Também reduzi ruído: exigir ≥2 camadas para uma alternativa entrar na lista (sem isso, 60 destinos apareciam, muitos com um único sinal fraco).

**Testado:** 7 testes unitários novos (`method-engine/test/catalogoVocacional.test.ts`), incluindo uma regressão directa ao bug do Direito; "Estética" confirma encontrar "Ciências Cosméticas"/"Técnico de Estética e Cosmética" (o bug original da Melina); "Gestora" activa correctamente a nota de área genérica.

---

## Parte 3 — arquitectura de 3 passos

Novo ficheiro [`web/src/lib/criticaRelatorio.ts`](../web/src/lib/criticaRelatorio.ts) com os prompts de crítica (12 critérios) e reescrita, mais um parser tolerante a formato (`parseCritica`). Integrado em `api/relatorio/route.ts`:

1. **Gerar** (como antes).
2. **Criticar** — sempre, nunca opcional. Segunda chamada à Anthropic.
3. **Reescrever** — só se pelo menos um dos 12 critérios falhar de facto. Terceira chamada, produz o relatório completo corrigido.

Guardado em `viq_relatorios`: `critica_llm`, `critica_criada_em`, `rascunho_reescrito` (só quando houve reescrita), `rascunho_versao` (incrementa a cada reescrita).

**Atenção operacional:**
- **Custo**: cada "Gerar rascunho" passa a custar 2-3 chamadas à Anthropic em vez de 1 (a crítica é sempre feita; a reescrita só quando necessário).
- **Duração**: subi `maxDuration` da rota de 60s para 280s — três chamadas sequenciais podem facilmente ultrapassar 60s. Vale a pena confirmar que o plano Vercel do projecto suporta functions com esta duração; se não suportar, a chamada pode cortar a meio.
- Um formato de crítica não reconhecido (o LLM não seguiu o formato pedido) nunca força uma reescrita — fica registado, sem acção automática sobre dados não interpretáveis.

---

## Parte 4 — regras de leitura conjunta no prompt

Adicionadas a `promptAdulto.ts`, texto literal do pedido: leitura conjunta obrigatória (Atmakaraka → Karakamsha → Modo de Ganho → planetas fracos, nesta ordem); Karakamsha nunca isolado do Atmakaraka; planeta fraco + área actual explica a insatisfação; opção declarada é vocabulário a traduzir, nunca aceite à letra; Mahadasha classifica e abre a secção do plano — com a classificação exacta desta carta já calculada e citada no prompt (não o LLM a adivinhar a partir da tabela).

---

## Parte 5 — bugs do template

- **5A** — a Roda da Vida nunca tinha sido vista pelo LLM (só o template a desenhava, depois do texto já escrito) — por isso não podia cumprir a instrução de referenciar valores extremos. Corrigido: `computeRodaDaVida` foi movida para o `method-engine` (para o prompt e o template partilharem a mesma computação, nunca duas versões), e os valores entram agora nos dados técnicos do prompt, com aviso "EXTREMO" para ≤4 ou ≥7.
- **5B** — a tabela de tensões estava limitada a 3 linhas (`.slice(0, 3)`); agora mostra todos os planetas com peso < 0,9, sem tecto.
- **5C** — verificado todo o `relatorioTemplate.ts`: sem termos técnicos no texto fixo (o "Artha Trikona" citado já tinha sido corrigido numa ronda anterior).
- **5D** — verificado: o texto livre da pessoa (pergunta específica, ideia concreta) já não aparece em maiúsculas nem com destaque tipográfico agressivo — só uma caixa de fundo suave com um rótulo pequeno acima, sem alterações necessárias.

---

## Parte 6 — backoffice

A reorganização em accordion já existia de uma ronda anterior (Ficha do cliente / Mapa técnico / Rascunho / Auditoria do LLM / Prompt completo / Entrega). Actualizações desta ronda:
- **Mapa técnico**: "Período actual" mostra agora a classificação da Mahadasha.
- **Auditoria do LLM**: mostra a crítica automática (sempre presente depois de gerar) e o rascunho reescrito (quando houve), além do botão manual "Analisar raciocínio" já existente — e o número de versão do rascunho.

---

## O que não consegui verificar

**Dados reais da Nádia.** Não existe nenhum registo de nascimento dela neste repositório nem tenho acesso à base de dados de produção (sem `SUPABASE_SERVICE_ROLE_KEY` neste ambiente). Em vez de inventar uma carta e apresentá-la como sendo dela, escrevi 6 testes unitários que isolam cada condição de cancelação da Neecha Bhanga contra o padrão exacto reportado (Lua debilitada, Amatyakaraka) — verifica o mecanismo, não substitui um teste com os dados reais dela.

---

## Migrações SQL pendentes

**Crítico — correr antes de gerar qualquer rascunho novo em produção.** O código agora escreve sempre em `critica_llm`/`rascunho_reescrito` ao gerar — sem a migração 0017, "Gerar rascunho" falha na escrita à base de dados.

```sql
-- 0016 (pode já ter corrido numa ronda anterior — ADD COLUMN IF NOT EXISTS, seguro repetir)
ALTER TABLE public.viq_relatorios
  ADD COLUMN IF NOT EXISTS auditoria_llm text,
  ADD COLUMN IF NOT EXISTS auditoria_criada_em timestamptz,
  ADD COLUMN IF NOT EXISTS dados_tecnicos jsonb,
  ADD COLUMN IF NOT EXISTS prompt_completo text;

-- 0017 (nova, ainda não corrida)
ALTER TABLE public.viq_relatorios
  ADD COLUMN IF NOT EXISTS critica_llm text,
  ADD COLUMN IF NOT EXISTS critica_criada_em timestamptz,
  ADD COLUMN IF NOT EXISTS rascunho_reescrito text,
  ADD COLUMN IF NOT EXISTS rascunho_versao integer DEFAULT 1;
```

---

## Testes

`method-engine`: **487 testes a passar** (474 já existentes + 13 novos desta ronda). Typecheck e `next build` limpos em `web/`. Prompt completo gerado de ponta a ponta (sem chamar a Anthropic) para confirmar que todas as secções novas encaixam correctamente na estrutura existente.

## Commit

`7e5c377` — "Redesenho completo do motor VocationIQ (Partes 1-6)".

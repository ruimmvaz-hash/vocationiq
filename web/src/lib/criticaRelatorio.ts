// Redesenho do motor VocationIQ, Parte 3 — arquitectura de 3 passos.
// Gerar (já existente) → Criticar (2ª chamada, 16 critérios — 12
// originais + 13-16 das 4 camadas técnicas, correcção do especialista)
// → Reescrever (3ª chamada, só se algum critério falhar). Tudo dentro do
// mesmo clique em "Gerar rascunho"/"Regenerar" — nunca uma acção
// separada do admin.

const INSTRUCAO_CRITICA = `Tens à tua frente:
 A) O prompt técnico completo
 B) O rascunho gerado

 Verifica contra estes critérios:

 1. TOM: há 'tu', 'teu', 'tua', 'tens' no texto?
    Lista cada ocorrência.

 2. REPETIÇÃO: a mesma conclusão aparece em mais de uma secção?
    Lista cada repetição.

 3. PLANETAS FRACOS: todos os planetas com peso < 0,9 são
    nomeados? Lista os que faltam.

 4. ÁREA ACTUAL: é usada como capital acumulado ou ignorada?

 5. OPÇÃO DECLARADA vs PERFIL: a opção é testada ou só
    confirmada?

 6. TENSÕES: tensões entre sinais contraditórios são nomeadas?
    Lista as que faltam.

 7. CANDIDATA FORA DA LISTA: foi testada contra catálogo
    ou só os 3 eixos abstractos?

 8. HORIZONTE TEMPORAL: há afirmações directas para
    períodos > 18 meses?

 9. PRIMEIRA PESSOA DO PLURAL: há 'identificámos', 'vimos',
    'calculámos'?

 10. MAHADASHA: o tom do ciclo maior abre a secção do plano?

 11. RODA DA VIDA: as dimensões com valor ≤ 4 ou ≥ 7 são
     referenciadas no texto?

 12. KARAKAMSHA: foi lido sempre com o Atmakaraka (nunca
     isolado)?

 13. AVASTHAS: se existe planeta Mrita cuja área governa a situação
     actual da pessoa, foi explicado na secção "Quem é"? Se não: FALHA.

 14. CONJUNÇÕES: cada conjunção activa foi usada numa frase concreta
     em "Quem é"? Se alguma foi ignorada: FALHA.

 15. YOGAS: cada yoga activo foi ligado a uma candidata ou opção
     concreta (nunca para criar candidatas novas)? Se foi só
     listado sem ligação: FALHA.

 16. VARGOTTAMA: se existe planeta Vargottama nos dados técnicos,
     a palavra "Vargottama" ou "estrutural" aparece na secção
     "Quem é"? Se não aparecer: FALHA — reescrita obrigatória.

 Para cada critério:
 PASSA ou FALHA — e se falha, exactamente o que está errado.
 Formato:
 1. TOM: PASSA
 2. REPETIÇÃO: FALHA — [detalhe]`;

export function construirPromptCritica(promptTecnico: string, rascunho: string): string {
  return `${INSTRUCAO_CRITICA}\n\n=== A) PROMPT TÉCNICO ENVIADO ===\n${promptTecnico}\n\n=== B) RASCUNHO GERADO ===\n${rascunho}`;
}

// TAREFA 1 / FALTA 1 (correcção do especialista, ronda de produção do
// motor adolescente) — 2 dos 12 critérios são especificamente adultos:
// o critério 1 (TOM) verifica "tu/teu/tua/tens" porque o relatório adulto
// usa "você" — mas o adolescente usa "tu" (ver promptAdolescente.ts), por
// isso o mesmo critério aplicado sem alterar reprovaria SEMPRE um
// relatório adolescente correcto. O critério 4 (ÁREA ACTUAL) não existe
// no ramo adolescente (não há área de trabalho actual) — substituído por
// "OPÇÃO EM CIMA DA MESA". Os restantes 10 critérios são genéricos e
// aplicam-se sem alteração a ambos os ramos.
const INSTRUCAO_CRITICA_ADOLESCENTE = `Tens à tua frente:
 A) O prompt técnico completo
 B) O rascunho gerado

 Verifica contra estes critérios:

 1. TOM: há 'você', 'seu', 'sua' no texto? (o relatório adolescente usa
    SEMPRE 'tu' — 'você' é um erro aqui, ao contrário do relatório
    adulto.) Lista cada ocorrência.

 2. REPETIÇÃO: a mesma conclusão aparece em mais de uma secção?
    Lista cada repetição.

 3. PLANETAS FRACOS: todos os planetas com peso < 0,9 são
    nomeados? Lista os que faltam.

 4. OPÇÃO EM CIMA DA MESA: cada opção em cima da mesa é usada como
    ponto de partida real (com o curso concreto listado) ou ignorada?

 5. OPÇÃO EM CIMA DA MESA vs PERFIL: cada opção é testada contra o
    perfil ou só confirmada sem crítica?

 6. TENSÕES: tensões entre sinais contraditórios são nomeadas?
    Lista as que faltam.

 7. CANDIDATA FORA DA LISTA: foi testada contra catálogo
    ou só os 3 eixos abstractos?

 8. HORIZONTE TEMPORAL: há afirmações directas para
    períodos > 18 meses?

 9. PRIMEIRA PESSOA DO PLURAL: há 'identificámos', 'vimos',
    'calculámos'?

 10. MAHADASHA: o tom do ciclo maior abre a secção do plano?

 11. RODA DA VIDA: as dimensões com valor ≤ 4 ou ≥ 7 são
     referenciadas no texto?

 12. KARAKAMSHA: foi lido sempre com o Atmakaraka (nunca
     isolado)?

 13. AVASTHAS: se existe planeta Mrita cuja área governa a situação
     actual da pessoa, foi explicado na secção "Quem é"? Se não: FALHA.

 14. CONJUNÇÕES: cada conjunção activa foi usada numa frase concreta
     em "Quem é"? Se alguma foi ignorada: FALHA.

 15. YOGAS: cada yoga activo foi ligado a uma candidata ou opção
     concreta (nunca para criar candidatas novas)? Se foi só
     listado sem ligação: FALHA.

 16. VARGOTTAMA: se existe planeta Vargottama nos dados técnicos,
     a palavra "Vargottama" ou "estrutural" aparece na secção
     "Quem é"? Se não aparecer: FALHA — reescrita obrigatória.

 Para cada critério:
 PASSA ou FALHA — e se falha, exactamente o que está errado.
 Formato:
 1. TOM: PASSA
 2. REPETIÇÃO: FALHA — [detalhe]`;

export function construirPromptCriticaAdolescente(promptTecnico: string, rascunho: string): string {
  return `${INSTRUCAO_CRITICA_ADOLESCENTE}\n\n=== A) PROMPT TÉCNICO ENVIADO ===\n${promptTecnico}\n\n=== B) RASCUNHO GERADO ===\n${rascunho}`;
}

export interface CriterioCritica {
  numero: number;
  nome: string;
  passa: boolean;
  detalhe: string;
}

export interface ResultadoCritica {
  criterios: CriterioCritica[];
  falhas: string[];
  /** `null` quando a resposta não seguiu o formato pedido em nenhuma linha — nunca se assume "passou tudo" nesse caso, mas também não se força uma reescrita sobre dados não interpretáveis (ver storage.ts/route.ts: crítica não parseável fica registada, sem reescrita automática). */
  todosPassaram: boolean | null;
}

const REGEX_LINHA_CRITERIO = /^\s*(\d{1,2})\.\s*([^:]+):\s*(PASSA|FALHA)\b\s*(?:[-–—]\s*(.*))?$/gim;

/** Extrai os até 12 critérios "N. NOME: PASSA|FALHA — detalhe" da resposta da crítica. Nunca lança erro em formato inesperado — devolve o que conseguir parsear. */
export function parseCritica(textoCritica: string): ResultadoCritica {
  const criterios: CriterioCritica[] = [];
  let match: RegExpExecArray | null;
  REGEX_LINHA_CRITERIO.lastIndex = 0;
  while ((match = REGEX_LINHA_CRITERIO.exec(textoCritica))) {
    criterios.push({
      numero: Number(match[1]),
      nome: match[2].trim(),
      passa: match[3].toUpperCase() === "PASSA",
      detalhe: (match[4] ?? "").trim(),
    });
  }
  const falhas = criterios.filter((c) => !c.passa).map((c) => `${c.numero}. ${c.nome}${c.detalhe ? `: ${c.detalhe}` : ""}`);
  return { criterios, falhas, todosPassaram: criterios.length ? falhas.length === 0 : null };
}

const INSTRUCAO_REESCRITA = `Reescreve este relatório corrigindo APENAS as falhas identificadas abaixo.
Não alteres o que está correcto.
Mantém todos os marcadores machine-readable (FRASE_ABERTURA:, IDENTIDADE:, DOM:, LIMITAÇÃO:, SÍNTESE:, INSIGHT:, FORÇA:, CANDIDATA:, PRIMEIRO PASSO:) e todos os cabeçalhos "## " das 6 secções, incluindo "## Quem é".`;

export function construirPromptReescrita(rascunhoOriginal: string, falhas: string[]): string {
  return `${INSTRUCAO_REESCRITA}\nFalhas a corrigir:\n${falhas.map((f) => `- ${f}`).join("\n")}\n\n=== RELATÓRIO ORIGINAL ===\n${rascunhoOriginal}`;
}

// Redesenho do motor VocationIQ, Parte 3 — arquitectura de 3 passos.
// Gerar (já existente) → Criticar (2ª chamada, 12 critérios) → Reescrever
// (3ª chamada, só se algum critério falhar). Tudo dentro do mesmo clique
// em "Gerar rascunho"/"Regenerar" — nunca uma acção separada do admin.

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

 5. OPÇÃO DECLARADA vs CARTA: a opção é testada ou só
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

 Para cada critério:
 PASSA ou FALHA — e se falha, exactamente o que está errado.
 Formato:
 1. TOM: PASSA
 2. REPETIÇÃO: FALHA — [detalhe]`;

export function construirPromptCritica(promptTecnico: string, rascunho: string): string {
  return `${INSTRUCAO_CRITICA}\n\n=== A) PROMPT TÉCNICO ENVIADO ===\n${promptTecnico}\n\n=== B) RASCUNHO GERADO ===\n${rascunho}`;
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
Mantém todos os marcadores machine-readable (IDENTIDADE:, FORÇA:, CANDIDATA:, PRIMEIRO PASSO:)`;

export function construirPromptReescrita(rascunhoOriginal: string, falhas: string[]): string {
  return `${INSTRUCAO_REESCRITA}\nFalhas a corrigir:\n${falhas.map((f) => `- ${f}`).join("\n")}\n\n=== RELATÓRIO ORIGINAL ===\n${rascunhoOriginal}`;
}

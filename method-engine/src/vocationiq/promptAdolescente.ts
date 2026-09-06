// RASCUNHO — TAREFA 6 (correcção do especialista). Ao contrário de
// `promptAdulto.ts` (que segue VOCATIONIQ-ADULTO-metodologia.md secção a
// secção, depois de múltiplas rondas de diagnóstico com dados reais antes
// de ir para produção), este ficheiro NÃO passou por nenhuma revisão
// dedicada — foi escrito só para o pipeline ponta-a-ponta do adolescente
// (TAREFA 6) poder ser calculado e mostrado ao especialista, demonstrando
// que os dados técnicos (eixos, elementos/modalidades, aspectos, cursos)
// chegam correctamente até um prompt. NÃO enviar a clientes reais sem uma
// ronda de revisão dedicada, ao mesmo nível de escrutínio que o prompt
// adulto teve (SPEC-vocacional.md tem a intenção geral, mas não é uma
// spec secção-a-secção como a do adulto).
//
// Reaproveita os blocos de dados já escritos e testados para o adulto
// (blocoEixoMissao, blocoModoDeGanho, blocoPesos, blocoDatas,
// blocoCatalogoVocacional, blocoElementosModalidades,
// blocoAspectosPessoais, TERMOS_PROIBIDOS, ESTADO_PT) — a astrologia por
// trás destes blocos não muda com a idade da pessoa; o que muda é a
// pergunta e a estrutura do relatório à volta deles, que aqui é mínima.

import type { VocationIQAxes } from "../lifeReport/vocationIQ";
import type { PesoPlaneta, SavPorCasa } from "./pesosPlanetas";
import type { ResultadoCatalogoVocacional } from "./catalogoVocacional";
import type { PerfilElementosModalidades, AspectoPessoal } from "./elementosEAspectos";
import type { CursosSugeridos } from "./catalogoCursos";
import { blocoEixoMissao, blocoModoDeGanho, blocoPesos, blocoDatas, blocoCatalogoVocacional, blocoElementosModalidades, blocoAspectosPessoais, TERMOS_PROIBIDOS, type DadosDatas } from "./promptAdulto";

export interface VocationiqIntakeAdolescente {
  nome: string;
  situacaoDeclarada: string;
  /** SPEC-vocacional.md — "opções em cima da mesa", 2-4 em texto livre. Pode vir vazio (nunca bloqueia o relatório). */
  opcoesAdolescente: string[];
  /** SPEC-vocacional.md — "qual delas te parece a mais provável hoje?". Não decide nada, é a hipótese em teste. */
  opcaoMaisProvavel?: string;
  preferenciaFamilia?: string;
}

export function construirPromptAdolescente(
  intake: VocationiqIntakeAdolescente,
  axes: VocationIQAxes,
  pesosPlanetas: PesoPlaneta[],
  datas: DadosDatas,
  horaNascimentoFornecida: boolean,
  catalogo: ResultadoCatalogoVocacional,
  savPorCasa: SavPorCasa[],
  elementosModalidades: PerfilElementosModalidades,
  aspectosPessoais: AspectoPessoal[],
  cursosPorDestino: Record<string, CursosSugeridos>,
): string {
  return `
[RASCUNHO — ver aviso no topo de promptAdolescente.ts. Não revisto ao nível do prompt adulto.]

És um especialista em orientação vocacional para adolescentes. Vais escrever um relatório para ${intake.nome} com base nos dados técnicos abaixo. Regras:
- Zero jargão astrológico visível — mesma lista de termos proibidos do relatório adulto:
${TERMOS_PROIBIDOS.map((t) => `  · ${t}`).join("\n")}
- Tom directo, respeitoso da idade da pessoa, sem infantilizar e sem jargão de coach.
- A lista de opções entrega-se sempre com a moldura explícita, no início e no fim: isto é para reconhecer, não para obedecer — o critério final é o reconhecimento interno do jovem, nunca o documento (catalogo-sistema-PT.json, regras_de_escrita.moldura_obrigatoria).
- Ao nomear um caminho fora do sistema formal, indica sempre a via de sustento associada — nunca "o teu caminho é X" sem dizer o que paga as contas enquanto X cresce.
- Nunca tratar uma boa nota escolar como sinal vocacional.
${horaNascimentoFornecida ? "" : "\nNOTA INTERNA — hora de nascimento não fornecida, elementos que dependem do Ascendente têm de ser tratados com cautela explícita."}

=== DADOS TÉCNICOS ===

-- Quem é --
Nome: ${intake.nome}
Situação declarada: ${intake.situacaoDeclarada}
${intake.preferenciaFamilia ? `Preferência da família (contexto, nunca decide): "${intake.preferenciaFamilia}"` : ""}

-- Eixo da Missão --
${blocoEixoMissao(axes)}

-- Modo de Ganho --
${blocoModoDeGanho(axes)}

-- Peso de cada planeta --
${blocoPesos(pesosPlanetas)}

-- Datas reais --
${blocoDatas(datas)}

-- Perfil de elementos e modalidades --
${blocoElementosModalidades(elementosModalidades)}

-- Aspectos principais --
${blocoAspectosPessoais(aspectosPessoais)}

-- Candidatas do catálogo (inclui vias concretas / cursos por destino) --
${blocoCatalogoVocacional(catalogo, cursosPorDestino)}

-- Opções em cima da mesa --
${
  intake.opcoesAdolescente.length
    ? intake.opcoesAdolescente.map((o) => `- ${o}${intake.opcaoMaisProvavel && o.toLowerCase() === intake.opcaoMaisProvavel.toLowerCase() ? " (a que a pessoa acha mais provável hoje — trata como a hipótese em teste, não como decisão)" : ""}`).join("\n")
    : "(nenhuma opção declarada — escreve a partir do que a carta sustenta em geral e da candidata fora da lista.)"
}

=== ESTRUTURA (rascunho — nunca revista secção a secção como a do adulto) ===
1. Abertura — quadro de dados + a pergunta.
2. O que a carta sustenta, em geral.
3. Uma leitura por opção em cima da mesa (se houver), citando sempre a via concreta/curso listado acima.
4. A candidata fora da lista, se existir, com a via concreta listada acima.
5. O plano — datas reais, um primeiro passo accionável.
`.trim();
}

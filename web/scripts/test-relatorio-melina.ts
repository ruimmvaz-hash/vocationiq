// TAREFA 6 (correcção do especialista) — gera o HTML completo do
// relatório para a carta real da Melina (São Paulo, 11/12/1984, 08:30
// local — a mesma fixture já usada em method-engine/test/catalogoVocacional.test.ts),
// com dados astrológicos REAIS mas texto de exemplo escrito à mão em vez
// de chamar a Anthropic, para confirmar visualmente:
// - Secção "Quem é" com aspectos, elementos e modalidades integrados;
// - Até 3 candidatas fora da lista (Auditoria e Controlo de Gestão,
//   Contabilidade e Fiscalidade, Engenharia Civil — confirmadas por
//   computação directa antes de escrever este placeholder);
// - Via concreta para cada candidata;
// - Anexo com valores unificados.
//
// Nota: esta carta não tem nenhum planeta debilitado — não há Neecha
// Bhanga para explicar aqui (ao contrário da Nádia). Confirmado por
// computação directa: Sol/Lua/Marte/Mercúrio/Júpiter/Vénus/Saturno estão
// todos em dignidade Amigo/Próprio/Exaltado/Neutro.
//
// Uso: npx tsx scripts/test-relatorio-melina.ts [nome-do-ficheiro.html]
// (por omissão: relatorio-melina-v2.html)

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import {
  computeD1Table,
  computeVocationIQAxes,
  computePesosPlanetas,
  computeSavPorCasa,
  currentDasha,
  computeTransits,
  computeWesternTable,
  computeElementosModalidades,
  computeAspectosPessoais,
  sugerirCursosParaCatalogo,
  catalogarDestinos,
  type DadosDatas,
  type BirthInput,
} from "@naveya/method-engine";
import { gerarHTMLRelatorio, type DadosParaTemplate } from "../src/lib/relatorioTemplate";

const ASPECTO_LABEL: Record<string, string> = { Conjuncao: "conjunção", Quadratura: "quadratura", Oposicao: "oposição" };
const PONTO_LABEL: Record<string, string> = { Sun: "Sol natal", Moon: "Lua natal", Mercury: "Mercúrio natal", Venus: "Vénus natal", Mars: "Marte natal", Ascendente: "Ascendente natal", MC: "Meio-céu natal" };

// Placeholder da leitura do LLM — escrito à mão, integrando deliberadamente
// o elemento dominante (Fogo), a modalidade dominante (Fixa) e os
// aspectos (Sol sextil Marte; Lua oposição Vénus; Sol conjunção Mercúrio)
// na narrativa de "Quem é", e citando a via concreta em cada uma das 3
// candidatas.
const TEXTO_EXEMPLO = `
FRASE_ABERTURA: A estrutura que já tem no corpo pede agora um lugar onde possa assinar por baixo dela.
IDENTIDADE: Autoridade prática que constrói valor duradouro sem precisar de o anunciar

## Abertura
Melina traz uma pergunta sobre se deve continuar na área da estética ou procurar algo que aproveite melhor a estrutura que sente ter por dentro.

## Quem é
DOM: O seu planeta mais forte está exaltado e a reger duas casas ligadas ao rendimento — raramente encontra dificuldade em transformar disciplina em resultado financeiro real.
DOM: Há uma urgência de agir directamente sobre o que quer que lhe é natural — quando decide ir atrás de algo, raramente hesita a meio do caminho, mesmo que isso signifique confrontar directamente o que a trava.
LIMITAÇÃO: O que sente por dentro e o que valoriza nas relações puxam em direcções opostas — uma tensão real entre a necessidade emocional e o que espera de quem a rodeia, que vale a pena reconhecer em vez de ignorar.
LIMITAÇÃO: A forma como pensa e comunica está ligada de perto à sua identidade consciente — quando fala de si, fá-lo quase sem filtro, o que pode soar mais directo do que pretende.
A sua forma de processar o mundo é firme e persistente, não impulsiva — prefere consolidar posição a mudar de direcção com frequência, e isso explica a sua resistência a abandonar o que já construiu.
O que genuinamente valoriza é a solidez que se prova com o tempo, não o reconhecimento imediato.
SÍNTESE: É alguém talhada para transformar estrutura em resultado prático, ainda a decidir onde essa estrutura rende mais.

## O que a carta sustenta
A sua carta aponta com clareza para uma área onde o que faz paga directamente — profissão e sustento são quase a mesma coisa nesta carta, sem precisar de intermediários.

## Leitura por opção
### Estética
FORÇA: fraca
INSIGHT: A área actual não é onde o seu planeta mais forte está a apontar com mais clareza.
1. Não há convergência forte a sustentar a estética como destino de fundo — o que já construiu aqui é experiência real, mas não é onde a carta aponta com mais força.
2. Continuar aqui custa-lhe não render ao máximo o seu planeta mais forte, que está ligado com mais clareza a estrutura, números e regulação do que a estética em si.
3. Falta-lhe ainda uma ponte concreta entre o que já sabe fazer e a área que a carta sustenta com mais força.
4. A sua matéria entra por rigor e disciplina, não pela componente estética que a área actual explora.

## Candidata fora da lista
CANDIDATA: Auditoria e Controlo de Gestão
Quatro camadas independentes convergem aqui, incluindo o planeta mais forte da sua carta (também a peça técnica mais ligada ao propósito de fundo) e a forma como ganha melhor. A via concreta é uma licenciatura de 3 a 5 anos; para auditoria interna (a função mais comum) não há certificação legal obrigatória — entra-se por posição júnior numa equipa de auditoria e progressão por experiência.

CANDIDATA: Contabilidade e Fiscalidade
A mesma convergência do planeta mais forte e da forma como ganha melhor, desta vez ligada a sinais próprios da área de gestão e economia. A via concreta passa por uma licenciatura seguida de um período de experiência antes da certificação profissional que permite assinar contas em nome próprio — cerca de 4 a 6 anos até estar plenamente operacional.

CANDIDATA: Engenharia Civil
A terceira convergência independente, ligada aqui a sinais próprios da área de engenharia. A via concreta é uma licenciatura ou mestrado de 3 a 5 anos; a inscrição profissional só é obrigatória para assinar projectos regulados — muitas funções técnicas em empresas de construção ou projecto não a exigem.

## O plano
O período actual favorece avançar — não é momento de espera, é de decisão sobre onde consolidar o que já construiu.
PRIMEIRO PASSO: Esta semana, liste as competências técnicas que já domina na área actual e que se transferem directamente para gestão/números — é o ponto de partida real, não zero.
`.trim();

async function main() {
  const nome = "Melina (teste)";
  // Fixture real — a mesma usada em method-engine/test/catalogoVocacional.test.ts.
  const utcDate = new Date(Date.UTC(1984, 11, 11, 11, 30, 0));
  const latitude = -(23 + 33 / 60 + 9 / 3600);
  const longitude = -(46 + 37 / 60 + 29 / 3600);
  const birth: BirthInput = { utcDate, latitude, longitude };

  const d1 = computeD1Table(birth);
  const pesosPlanetas = computePesosPlanetas(d1);
  const axes = computeVocationIQAxes(
    d1,
    pesosPlanetas.map((p) => ({ planeta: p.planeta, peso: p.peso, estado: p.estado })),
  );
  const savPorCasa = computeSavPorCasa(d1);

  const agora = new Date();
  const dasha = currentDasha(birth.utcDate, agora);
  const proximas = dasha.allAntardashas.filter((a) => a.start >= dasha.antardasha.end).slice(0, 2);
  const transitos = computeTransits(birth, agora);
  const formatarAspectos = (hits: { to: string; aspect: string; orb: number }[]) => hits.map((h) => `${ASPECTO_LABEL[h.aspect] ?? h.aspect} com o ${PONTO_LABEL[h.to] ?? h.to} (orbe ${h.orb.toFixed(1)}°)`);

  const datas: DadosDatas = {
    mahadashaAtual: { senhor: dasha.mahadasha.lord, inicio: dasha.mahadasha.start, fim: dasha.mahadasha.end },
    antardashaAtual: { senhor: dasha.antardasha.lord, inicio: dasha.antardasha.start, fim: dasha.antardasha.end },
    proximasAntardashas: proximas.map((a) => ({ senhor: a.lord, inicio: a.start, fim: a.end })),
    transitoJupiter: { signo: transitos.jupiter.sign, aspectosAoNatal: formatarAspectos(transitos.jupiter.aspectsToNatal) },
    transitoSaturno: { signo: transitos.saturn.sign, aspectosAoNatal: formatarAspectos(transitos.saturn.aspectsToNatal) },
  };

  const dadosTemplate: DadosParaTemplate = {
    nome,
    dataNascimento: "1984-12-11",
    horaNascimento: "08:30",
    localNascimento: "São Paulo, Brasil",
    situacaoDeclarada: "Já trabalho e quero mudar",
    areaActual: "Estética",
    anosExperiencia: "5 a 10 anos",
    opcoesConsideradas: [],
  };

  const westernTable = computeWesternTable(birth);
  const catalogoResultados = catalogarDestinos(
    axes,
    pesosPlanetas,
    savPorCasa,
    { areaActual: dadosTemplate.areaActual, anosExperiencia: dadosTemplate.anosExperiencia },
    { planeta: axes.missionAxis.atmakaraka, nakshatra: d1.rows[axes.missionAxis.atmakaraka].nakshatra },
    westernTable.ascendant.ruler,
  );
  const elementosModalidades = computeElementosModalidades(westernTable.planets);
  const aspectosPessoais = computeAspectosPessoais(westernTable.planets);
  const cursosPorDestino = sugerirCursosParaCatalogo(catalogoResultados);

  console.log("Elementos e modalidades:", JSON.stringify(elementosModalidades));
  console.log("Aspectos pessoais:", aspectosPessoais.map((a) => `${a.planetaA} ${a.aspecto} ${a.planetaB}`).join(" | "));
  console.log("Candidatas fora da lista:", catalogoResultados.candidatasForaDaLista.map((c) => c.nome).join(", "));

  const html = gerarHTMLRelatorio(dadosTemplate, TEXTO_EXEMPLO, axes, pesosPlanetas, axes.earningModeAll, datas, savPorCasa, catalogoResultados);

  const outDir = join(process.cwd(), "..", "docs");
  mkdirSync(outDir, { recursive: true });
  const nomeFicheiro = process.argv[2] || "relatorio-melina-v2.html";
  const outPath = join(outDir, nomeFicheiro);
  writeFileSync(outPath, html, "utf-8");
  console.log(`Guardado em: ${outPath}`);
}

main().catch((err) => {
  console.error("Falha no script de teste:", err);
  process.exit(1);
});

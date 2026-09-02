// Gera o HTML visual completo do relatório para um caso de teste, com
// dados astrológicos REAIS (mesma pipeline da rota real) mas um texto de
// exemplo escrito à mão em vez de chamar a Anthropic — para inspeccionar
// o template (Tarefa 2) sem gastar uma chamada real. O texto de exemplo
// segue exactamente o formato que o prompt exige (cabeçalhos "## ",
// "### <opção>", "FORÇA:", "CANDIDATA:", "PRIMEIRO PASSO:") para
// exercitar o parser do template da mesma forma que uma resposta real da
// Anthropic o faria.
//
// Uso: npx tsx scripts/test-relatorio-html.ts

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import {
  computeD1Table,
  computeVocationIQAxes,
  computePesosPlanetas,
  currentDasha,
  computeTransits,
  type DadosDatas,
  type BirthInput,
} from "@naveya/method-engine";
import { geocodeCityCountry } from "../src/lib/reportGeo";
import { localBirthTimeToUtc } from "../src/lib/localBirthTime";
import { gerarHTMLRelatorio, type DadosParaTemplate } from "../src/lib/relatorioTemplate";

const ASPECTO_LABEL: Record<string, string> = { Conjuncao: "conjunção", Quadratura: "quadratura", Oposicao: "oposição" };
const PONTO_LABEL: Record<string, string> = { Sun: "Sol natal", Moon: "Lua natal", Mercury: "Mercúrio natal", Venus: "Vénus natal", Mars: "Marte natal", Ascendente: "Ascendente natal", MC: "Meio-céu natal" };

const TEXTO_EXEMPLO = `
## Abertura
Rui trabalha em Contabilidade há entre 5 e 10 anos e chega a este relatório com uma pergunta concreta: faz mais sentido avançar para consultoria a solo, ou procurar um lugar de gestão dentro de uma estrutura maior? Diz sentir-se apenas a processar números para outras pessoas decidirem, e quer estar mais perto da decisão em si.

## O que a carta sustenta
A tua carta aponta para uma missão de fundo ligada a compreender o que se passa nos bastidores antes de outros o veem — e a tua forma natural de ganhar dinheiro passa pela voz: explicar, aconselhar, dizer a alguém o que fazer com clareza. Não é por acaso que a parte do teu trabalho que menos te preenche é exactamente a que te tira essa voz — processar números sem opinar sobre eles.

## Leitura por opção

### Consultoria (SAP, RH, gestão, etc.)
FORÇA: forte
1. Duas camadas independentes convergem aqui: a tua forma de ganhar dinheiro mais forte é pela voz e pelo conselho directo, e o que o mercado já reconhece em ti aponta para a mesma direcção — seres tu a dizer o caminho, não só a registá-lo.
2. Vai custar-te instabilidade nos primeiros tempos — sem uma estrutura a pagar-te ao fim do mês, a tua exigência interna de segurança vai testar-te mais do que a parte técnica do trabalho.
3. Falta-te ainda uma rede de clientes que te procure directamente, não através de uma empresa — isso aprende-se, mas não se compra, e é o que mais separa quem tenta consultoria de quem consegue viver dela.
4. A tua matéria entra pela forma de comunicar decisões difíceis com clareza — não pelo sector financeiro em si, mas por seres capaz de dizer a alguém, com segurança, o que fazer a seguir.

### Finanças / contabilidade
FORÇA: moderada
1. Há suporte real aqui, mas menos directo — continuares na mesma área aproveita a tua experiência já construída, mas não resolve por si só a falta de voz que descreves.
2. O custo é continuares a pagar o mesmo preço que já pagas hoje: ficares perto da decisão sem seres tu a tomá-la, mesmo que o cargo mude de nome.
3. O que falta é menos técnico e mais de posição — precisas de um lugar onde a tua opinião conte antes da execução, não depois dela.
4. A tua matéria entra melhor aqui através de um papel de análise sénior ou consultoria interna, nunca puramente executante.

## Candidata fora da lista
CANDIDATA: nenhuma
As quatro camadas não convergem com força suficiente para apontar a nenhuma outra área fora das duas que já trazes — a tua carta não aponta a nada fora do que já pensaste. Isso não é uma limitação: é sinal de que a pergunta certa já está na tua lista, falta é decidir a forma (a solo ou dentro de estrutura), não o destino.

## O plano
O período que atravessas agora pede paciência antes de acção visível — é uma fase mais de consolidar bases do que de anunciar mudanças. A janela que se segue tende a abrir mais espaço para decisões práticas relacionadas com dinheiro e recursos.
PRIMEIRO PASSO: Esta semana, contacta duas pessoas que já fazem consultoria a solo na tua área e pergunta-lhes directamente o que ninguém conta sobre o primeiro ano — não para decidir já, só para teres dados reais em vez de medo abstracto.
`.trim();

async function main() {
  const localNascimento = "Porto, Portugal";
  const dataNascimento = "1988-04-12";
  const horaNascimento = "07:35";

  const geo = await geocodeCityCountry(localNascimento);
  if (!geo) throw new Error(`Não consegui geocodificar "${localNascimento}"`);
  const [year, month, day] = dataNascimento.split("-").map(Number);
  const utcDate = localBirthTimeToUtc({ day, month, year }, horaNascimento, geo.timezone);
  if (!utcDate) throw new Error("data/hora inválida");
  const birth: BirthInput = { utcDate, latitude: geo.latitude, longitude: geo.longitude };

  const d1 = computeD1Table(birth);
  const axes = computeVocationIQAxes(d1);
  const pesosPlanetas = computePesosPlanetas(d1);

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
    nome: "Rui (teste)",
    dataNascimento,
    horaNascimento,
    localNascimento,
    situacaoDeclarada: "Já trabalho e quero mudar",
    areaActual: "Contabilidade",
    anosExperiencia: "5 a 10 anos",
    oQueNaoFunciona: "Sinto que estou só a processar números para outras pessoas decidirem — quero estar mais perto da decisão em si.",
    opcoesConsideradas: ["Consultoria (SAP, RH, gestão, etc.)", "Finanças / contabilidade"],
    ideiaConcreta: "Estou a pensar em consultoria financeira para pequenas empresas.",
    perguntaEspecifica: "Faz sentido tentar consultoria a solo ou é melhor procurar um cargo de gestão numa empresa maior?",
  };

  const html = gerarHTMLRelatorio(dadosTemplate, TEXTO_EXEMPLO, axes, pesosPlanetas, axes.earningModeAll, datas);

  // Corre sempre a partir de web/ (convenção dos outros scripts) — docs/
  // fica um nível acima, na raiz do repositório.
  const outDir = join(process.cwd(), "..", "docs");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "relatorio-teste-visual.html");
  writeFileSync(outPath, html, "utf-8");
  console.log(`Guardado em: ${outPath}`);
  console.log(`Tamanho: ${html.length} caracteres`);
}

main().catch((err) => {
  console.error("Falha no script de teste:", err);
  process.exit(1);
});

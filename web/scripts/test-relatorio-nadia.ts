// Script de teste — gera o HTML completo do relatório para o caso da
// Nádia (10/01/1983, 15:02, Luanda), com dados astrológicos REAIS mas
// texto de exemplo escrito à mão em vez de chamar a Anthropic — pedido
// explícito do especialista para validar visualmente a tabela de atrito
// (frases distintas por planeta) e os restantes elementos visuais com
// dados reais dela. `areaTrabalhoActual: "Empresária"` e `areasDestino: []`
// testam deliberadamente o caminho "sem opções declaradas" (secção 1.3 da
// metodologia — candidatas derivadas do texto livre, ou "nenhuma").
//
// Uso: npx tsx scripts/test-relatorio-nadia.ts [nome-do-ficheiro.html]
// (por omissão: relatorio-nadia-v1.html)

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
  catalogarDestinos,
  type DadosDatas,
  type BirthInput,
} from "@naveya/method-engine";
import { geocodeCityCountry } from "../src/lib/reportGeo";
import { localBirthTimeToUtc } from "../src/lib/localBirthTime";
import { gerarHTMLRelatorio, type DadosParaTemplate } from "../src/lib/relatorioTemplate";

const ASPECTO_LABEL: Record<string, string> = { Conjuncao: "conjunção", Quadratura: "quadratura", Oposicao: "oposição" };
const PONTO_LABEL: Record<string, string> = { Sun: "Sol natal", Moon: "Lua natal", Mercury: "Mercúrio natal", Venus: "Vénus natal", Mars: "Marte natal", Ascendente: "Ascendente natal", MC: "Meio-céu natal" };

const TEXTO_EXEMPLO = `
FRASE_ABERTURA: A voz que ainda não usou em público já é o activo mais valioso da sua carta.
IDENTIDADE: Autoridade estrutural que constrói com paciência o que outros anunciam depressa

## Abertura
Nádia diz que está numa fase de mudar de rumo profissional, mas ainda sem uma direcção concreta declarada — chega a este relatório a pedir que a carta lhe mostre o que ela própria ainda não nomeou.

## Quem é
DOM: Uma capacidade de liderar publicamente que a sua carta sustenta com clareza, mesmo que ainda não a tenha exercido a sério.
DOM: Uma estrutura interior sólida, construída para durar, que raramente se vê abalada por pressão de curto prazo.
LIMITAÇÃO: A gestão emocional em decisões importantes pede atenção — não é o ponto mais forte da carta e vale a pena não decidir grandes coisas em dias de baixa.
LIMITAÇÃO: A fluidez de explicar e ser entendida ainda precisa de ser construída — não lhe sai naturalmente, ao contrário de outras partes da carta.
O que genuinamente valoriza é a substância que aguenta o tempo, não o efeito imediato — prefere construir uma coisa sólida a parecer bem-sucedida depressa.
SÍNTESE: É alguém talhada para liderar com estrutura, mas ainda a aprender a comunicar essa força em voz alta.

## O que a carta sustenta
A sua carta aponta com clareza para a liderança pública como a forma mais forte de gerar valor — não pela voz isolada, mas por assumir a cara de um projecto e sustentá-lo com disciplina ao longo do tempo.

## Leitura por opção
### Empresária
FORÇA: moderada
INSIGHT: A estrutura para liderar já existe — falta ainda o canal para a expressar com clareza.
1. A carta sustenta a liderança de um projecto próprio com uma base real: a força que aponta para casa pública é a mais alta de toda a carta.
2. Vai custar-lhe mais do que a outros comunicar essa liderança com clareza — a fluidez de explicar ainda não é natural, e isso pesa mais em fases de arranque, quando é preciso convencer sem ainda ter resultados para mostrar.
3. Falta-lhe ainda experiência de comunicar em público de forma repetida — é algo que se treina, não um traço fixo.
4. A sua matéria entra aqui pela forma como estrutura e sustenta, não pela rapidez com que comunica — a liderança que a sua carta aponta é de fundo, não de palco.

## Candidata fora da lista
CANDIDATA: Ciências da Informação e Documentação
Seis camadas independentes da sua carta convergem nesta área, incluindo o planeta mais forte que tem — é uma força estrutural que ainda não tinha nomeado.

## O plano
O período actual pede que prepare e feche o que já não serve, antes de colher o que vem a seguir — não é o momento de anunciar em grande, é o de organizar por dentro.
PRIMEIRO PASSO: Esta semana, escreva por escrito (não em voz alta) a ideia de projecto que tem em mente, com o máximo de detalhe possível — antes de a testar em público, testa-a primeiro no papel.
`.trim();

async function main() {
  const localNascimento = "Luanda, Angola";
  const dataNascimento = "1983-01-10";
  const horaNascimento = "15:02";

  const geo = await geocodeCityCountry(localNascimento);
  if (!geo) throw new Error(`Não consegui geocodificar "${localNascimento}"`);
  const [year, month, day] = dataNascimento.split("-").map(Number);
  const utcDate = localBirthTimeToUtc({ day, month, year }, horaNascimento, geo.timezone);
  if (!utcDate) throw new Error("data/hora inválida");
  const birth: BirthInput = { utcDate, latitude: geo.latitude, longitude: geo.longitude };

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
    nome: "Nádia (teste)",
    dataNascimento,
    horaNascimento,
    localNascimento,
    situacaoDeclarada: "Já trabalho e quero mudar",
    areaActual: "Empresária",
    anosExperiencia: "5 a 10 anos",
    opcoesConsideradas: [], // areasDestino: [] — caso "sem opções declaradas" (SPEC 1.3)
  };

  const regenteAscendenteOcidental = computeWesternTable(birth).ascendant.ruler;
  const catalogoResultados = catalogarDestinos(
    axes,
    pesosPlanetas,
    savPorCasa,
    { areaActual: dadosTemplate.areaActual, anosExperiencia: dadosTemplate.anosExperiencia },
    { planeta: axes.missionAxis.atmakaraka, nakshatra: d1.rows[axes.missionAxis.atmakaraka].nakshatra },
    regenteAscendenteOcidental,
  );
  // Correcção visual do diagrama de convergência (relatório impresso, pág.
  // 16) — força um caso de teste com 6 camadas, incluindo deliberadamente
  // os 2 rótulos mais longos que causavam a sobreposição/corte no SVG
  // (frases sem "(" nem ":" perto do início, que antes viravam um único
  // rótulo por inteiro sem quebra de linha). Só activo quando se pede
  // explicitamente "relatorio-v8.html" — nos outros nomes de ficheiro o
  // resultado real do catálogo continua a mandar.
  if (process.argv[2] === "relatorio-v8.html") {
    catalogoResultados.candidataForaDaLista = {
      nome: "Ciências da Informação e Documentação",
      id: "biblioteconomia",
      convergencia: 6,
      camadas: [
        "Planeta de maior peso (Saturn, peso 1.76) aponta para este destino",
        "Regente do Modo de Ganho dominante (Saturn, casa 10) — eixo do rendimento aponta para este destino",
        "Casa temática forte (casa 9): dharma, ensino superior, filosofia, publicação, teologia, direito internacional, viagem, tradução académica, ética, ciências da religião, escrita de não-ficção",
        "Ideia concreta partilhada aponta para este destino",
        `Sinais estruturados da área "Ciências da Informação e Documentação" confirmam (índice inverso)`,
        "Combinação sol+vénus (mesma casa) aponta para este destino",
      ],
    };
  }

  const html = gerarHTMLRelatorio(dadosTemplate, TEXTO_EXEMPLO, axes, pesosPlanetas, axes.earningModeAll, datas, savPorCasa, catalogoResultados);

  const outDir = join(process.cwd(), "..", "docs");
  mkdirSync(outDir, { recursive: true });
  const nomeFicheiro = process.argv[2] || "relatorio-nadia-v1.html";
  const outPath = join(outDir, nomeFicheiro);
  writeFileSync(outPath, html, "utf-8");
  console.log(`Guardado em: ${outPath}`);
  console.log(`Ascendente: ${d1.ascendant.sign}`);
  console.log(`Planetas com peso < 0,9: ${pesosPlanetas.filter((p) => p.peso < 0.9).map((p) => `${p.planeta} (${p.peso})`).join(", ")}`);
}

main().catch((err) => {
  console.error("Falha no script de teste:", err);
  process.exit(1);
});

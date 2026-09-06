// TAREFA 7 (correcção do especialista) — gera o HTML completo do relatório
// para o caso adulto pedido (Porto, 12/04/1988, 07:35, contabilista, 2
// opções declaradas — o mesmo caso de teste de scripts/test-relatorio-prompt.ts),
// com dados astrológicos REAIS mas texto de exemplo escrito à mão em vez
// de chamar a Anthropic, para confirmar visualmente:
// - Anexo "Apoio por área de vida" com valores unificados (X,X/10), nunca SAV bruto;
// - Elementos e modalidades integrados na prosa da secção "Quem é";
// - Um aspecto entre planetas pessoais nomeado como tensão/harmonia;
// - Vias concretas (entrada no mercado) citadas por opção.
//
// Uso: npx tsx scripts/test-relatorio-porto.ts [nome-do-ficheiro.html]
// (por omissão: relatorio-v9.html)

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
import { geocodeCityCountry } from "../src/lib/reportGeo";
import { localBirthTimeToUtc } from "../src/lib/localBirthTime";
import { gerarHTMLRelatorio, type DadosParaTemplate } from "../src/lib/relatorioTemplate";

const ASPECTO_LABEL: Record<string, string> = { Conjuncao: "conjunção", Quadratura: "quadratura", Oposicao: "oposição" };
const PONTO_LABEL: Record<string, string> = { Sun: "Sol natal", Moon: "Lua natal", Mercury: "Mercúrio natal", Venus: "Vénus natal", Mars: "Marte natal", Ascendente: "Ascendente natal", MC: "Meio-céu natal" };

// Placeholder da leitura do LLM — escrito à mão, integrando deliberadamente
// o elemento dominante (Ar) e o aspecto Vénus-Marte (trígono) na narrativa
// de "Quem é" (nunca como lista à parte, per a instrução do prompt), e
// citando a via concreta ("Ordem dos Contabilistas Certificados") na
// leitura da opção "Finanças / contabilidade".
const TEXTO_EXEMPLO = `
FRASE_ABERTURA: Processar os números de outra pessoa já lhe ensinou tudo menos a assinar por baixo deles.
IDENTIDADE: Estratega que pensa em rede e persegue o que deseja sem hesitar

## Abertura
Rui diz que sente que está só a processar números para outras pessoas decidirem, e quer perceber se faz mais sentido avançar sozinho ou subir para um cargo de gestão numa empresa maior.

## Quem é
DOM: Marte exaltado dá-lhe uma capacidade de execução directa e decisiva que poucos têm — quando decide agir, age com força real, não com hesitação.
DOM: A sua carta tem uma inclinação forte para o pensamento em rede e a comunicação — a sua forma de processar e agir no mundo é mais mental e social do que instintiva, o que explica porque prefere entender o sistema todo antes de se comprometer com uma única peça dele.
LIMITAÇÃO: O valor que atribui ao seu próprio trabalho é a área mais frágil da carta — arrisca-se a cobrar abaixo do que vale quando decide avançar por conta própria.
O que genuinamente valoriza é conseguir ver o desenho todo antes de agir — não se contenta em processar uma peça isolada de um sistema que não escolheu. O que quer e o que sente por dentro cooperam sem esforço nesta carta: raramente hesita entre o que deseja e o que sente que precisa. E há uma harmonia natural entre o que a atrai e a forma como o persegue — quando decide ir atrás de algo, a carta não lhe põe entraves a meio do caminho.
SÍNTESE: É alguém talhado para ver o sistema inteiro e agir com decisão sobre ele, mas ainda a aprender a cobrar o que essa visão vale.

## O que a carta sustenta
A sua carta aponta para ganhar pela voz — pela consultoria, pelo ensinar e aconselhar a partir do que sabe — mais do que por ocupar um lugar fixo dentro da estrutura de outra pessoa.

## Leitura por opção
### Consultoria (SAP, RH, gestão, etc.)
FORÇA: moderada
INSIGHT: A carta sustenta a consultoria como forma, mas ainda sem uma âncora de sector clara.
1. A sua carta sustenta ganhar pela voz — a consultoria como formato bate certo com isso, mesmo que "SAP" especificamente não seja o que a carta aponta com mais força. Ao contrário da contabilidade, a consultoria de gestão não tem uma única porta de entrada regulada em Portugal — entra-se por portefólio e rede de contactos, não por um exame de acesso a uma ordem profissional.
2. Vai custar-lhe mais do que a outros nomear o próprio valor com clareza suficiente para cobrar por ele desde o início.
3. Falta-lhe ainda uma especialização nítida dentro da consultoria — o formato está sustentado, o nicho ainda não.
4. A sua matéria entra aqui pela capacidade de ver o sistema todo de uma empresa, não só a parte financeira dele.

### Finanças / contabilidade
FORÇA: forte
INSIGHT: A área onde já está é também a que a carta mais sustenta tecnicamente.
1. Duas fontes independentes convergem aqui: a experiência já acumulada nesta área, e a forma como a sua carta liga naturalmente a esta função — a via concreta de entrada nesta área em Portugal passa pela Ordem dos Contabilistas Certificados, que já lhe é familiar.
2. O custo aqui não é técnico — é de significado: continuar a processar números para a decisão de outra pessoa, sem nunca assinar por baixo dela.
3. O que falta não é competência, é posição — mudar de processar para decidir, dentro do mesmo território técnico.
4. A sua matéria entra pela profundidade técnica já construída, não por uma reinvenção completa.

## Candidata fora da lista
CANDIDATA: nenhuma
Para uma candidata fora da lista precisava de convergirem pelo menos quatro camadas independentes incluindo a peça mais forte da sua carta — isso não acontece aqui de forma clara o suficiente para nomear uma única candidata.

## O plano
O período actual pede construção lenta e disciplinada — não é o momento de decisões drásticas, é o de assentar uma base que aguente.
PRIMEIRO PASSO: Esta semana, escreva por escrito o que cobraria por uma primeira consultoria a solo — antes de a oferecer a ninguém, defina o número.
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

  const westernTable = computeWesternTable(birth);
  const catalogoResultados = catalogarDestinos(
    axes,
    pesosPlanetas,
    savPorCasa,
    { areaActual: dadosTemplate.areaActual, anosExperiencia: dadosTemplate.anosExperiencia, ideiaConcreta: dadosTemplate.ideiaConcreta },
    { planeta: axes.missionAxis.atmakaraka, nakshatra: d1.rows[axes.missionAxis.atmakaraka].nakshatra },
    westernTable.ascendant.ruler,
  );
  const elementosModalidades = computeElementosModalidades(westernTable.planets);
  const aspectosPessoais = computeAspectosPessoais(westernTable.planets);
  const cursosPorDestino = sugerirCursosParaCatalogo(catalogoResultados);

  console.log("Elementos e modalidades:", JSON.stringify(elementosModalidades));
  console.log("Aspectos pessoais:", aspectosPessoais.map((a) => `${a.planetaA} ${a.aspecto} ${a.planetaB}`).join(" | "));
  console.log(
    "Vias concretas (amostra):",
    Object.entries(cursosPorDestino)
      .slice(0, 3)
      .map(([id, c]) => `${id}: ${c.entradaMercadoAdulto.join("; ")}`)
      .join(" || "),
  );

  const html = gerarHTMLRelatorio(dadosTemplate, TEXTO_EXEMPLO, axes, pesosPlanetas, axes.earningModeAll, datas, savPorCasa, catalogoResultados);

  // Apêndice de depuração — SÓ neste ficheiro de teste, nunca no relatório
  // real entregue a um cliente. O texto do relatório em si (acima) escreve
  // os elementos/modalidades e os aspectos em prosa, sem os nomear
  // literalmente (a mesma convenção usada para todo o resto do jargão
  // astrológico — Nakshatra, nomes de planetas em sânscrito, "casa X",
  // etc. — nunca aparecem literalmente no texto real). Este apêndice
  // existe só para confirmar, sem ambiguidade, que os dados chegaram
  // correctamente ao pipeline antes de virarem prosa.
  const apendiceDebug = `
  <section class="seccao" style="border-top:4px dashed #999;margin-top:40px;padding-top:20px">
    <h2 class="titulo-seccao">[APÊNDICE DE DEPURAÇÃO — só neste ficheiro de teste, nunca no relatório real]</h2>
    <p>O texto do relatório acima nunca nomeia elementos/modalidades ou aspectos literalmente (mesma convenção usada para todo o jargão astrológico) — traduz sempre para prosa. Este apêndice mostra os valores brutos calculados pelo pipeline, para confirmar que chegaram até ao texto sem ambiguidade.</p>
    <p><strong>Elementos e modalidades (computeElementosModalidades):</strong><br>
    Elemento dominante: ${elementosModalidades.elementoDominante} — Fogo ${elementosModalidades.distribuicaoElementos.Fogo} | Terra ${elementosModalidades.distribuicaoElementos.Terra} | Ar ${elementosModalidades.distribuicaoElementos.Ar} | Água ${elementosModalidades.distribuicaoElementos.Água}<br>
    Modalidade dominante: ${elementosModalidades.modalidadeDominante} — Cardinal ${elementosModalidades.distribuicaoModalidades.Cardinal} | Fixa ${elementosModalidades.distribuicaoModalidades.Fixa} | Mutável ${elementosModalidades.distribuicaoModalidades.Mutável}</p>
    <p><strong>Aspectos entre planetas pessoais (computeAspectosPessoais):</strong><br>
    ${aspectosPessoais.map((a) => `${a.planetaA} ${a.aspecto} ${a.planetaB} (orbe ${a.orbe.toFixed(1)}°)`).join("<br>")}</p>
    <p><strong>Vias concretas por destino (sugerirCursosParaCatalogo → catalogoCursos.ts):</strong><br>
    ${Object.entries(cursosPorDestino)
      .map(([id, c]) => `${id} (${c.cursos[0].nome}, ${c.cursos[0].nivel}, QNQ ${c.cursos[0].qnq ?? "—"}): ${c.entradaMercadoAdulto.join("; ")}`)
      .join("<br>")}</p>
  </section>`;
  const htmlComDebug = html.replace("</body>", `${apendiceDebug}\n</body>`);

  const outDir = join(process.cwd(), "..", "docs");
  mkdirSync(outDir, { recursive: true });
  const nomeFicheiro = process.argv[2] || "relatorio-v9.html";
  const outPath = join(outDir, nomeFicheiro);
  writeFileSync(outPath, htmlComDebug, "utf-8");
  console.log(`Guardado em: ${outPath}`);
}

main().catch((err) => {
  console.error("Falha no script de teste:", err);
  process.exit(1);
});

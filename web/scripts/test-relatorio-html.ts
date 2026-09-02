// Gera o HTML visual completo do relatório para um caso de teste, com
// dados astrológicos REAIS (mesma pipeline da rota real) mas um texto de
// exemplo escrito à mão em vez de chamar a Anthropic — para inspeccionar
// o template sem gastar uma chamada real. O texto de exemplo segue
// exactamente o formato que o prompt exige (cabeçalhos "## ",
// "### <opção>", "FORÇA:", "CANDIDATA:", "PRIMEIRO PASSO:") e cumpre o
// VOLUME OBRIGATÓRIO (mínimo de parágrafos por secção/parte) para testar
// se o template produz mesmo 8-10 páginas A4 quando o conteúdo tem a
// profundidade pedida.
//
// Uso: npx tsx scripts/test-relatorio-html.ts [nome-do-ficheiro.html]
// (por omissão: relatorio-v2.html)

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import {
  computeD1Table,
  computeVocationIQAxes,
  computePesosPlanetas,
  computeSavPorCasa,
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
Rui trabalha em Contabilidade há entre 5 e 10 anos e chega a este relatório com uma pergunta concreta: faz mais sentido avançar para consultoria a solo, ou procurar um lugar de gestão dentro de uma estrutura maior? Diz sentir-se apenas a processar números para outras pessoas decidirem, e quer estar mais perto da decisão em si — a ideia de consultoria financeira para pequenas empresas já lhe passou pela cabeça, mas ainda não sabe se é desejo ou se é fuga.

## O que a carta sustenta
A tua missão de fundo está ligada a compreender o que se passa nos bastidores antes de outros o verem — não é uma inclinação superficial, é a forma mais forte da tua carta de organizar a tua vontade. Isso explica porque é que "ver os números" nunca foi o problema para ti: sempre soubeste ler o que eles significam antes de qualquer outra pessoa na sala. O que falta não é capacidade de compreensão, é espaço para a expressares em voz alta antes de ser tarde para influenciar a decisão.

A tua forma natural de ganhar dinheiro passa pela voz: explicar, aconselhar, dizer a alguém com clareza o que fazer a seguir. Este é o sinal mais forte de toda a tua carta, e não é por acaso que a parte do teu trabalho actual que menos te preenche é exactamente a que te tira essa voz — processar números para que outra pessoa decida por cima deles. Enquanto continuares num papel puramente executante, esta tensão não desaparece sozinha; só se resolve mudando a posição a partir da qual falas, não mudando de sector.

A forma como já és reconhecido de fora — o que colegas e clientes já esperam de ti sem precisares de o pedir — aponta consistentemente para seres a pessoa que outros procuram quando precisam de uma opinião fundamentada sobre dinheiro, não só um número calculado. Esse reconhecimento já existe hoje, mesmo dentro do cargo actual; a pergunta não é se o mercado te vê assim, é se estás disposto a construir uma estrutura (própria ou dentro de uma empresa maior) que deixe essa voz aparecer com mais peso do que tem tido até agora.

## Leitura por opção

### Consultoria (SAP, RH, gestão, etc.)
FORÇA: forte
1. Duas camadas independentes convergem com força nesta opção: a tua forma de ganhar dinheiro mais forte na carta é precisamente pela voz e pelo conselho directo, e o que o mercado já reconhece em ti aponta exactamente na mesma direcção — seres tu a dizer o caminho a seguir, não só a registá-lo depois de decidido. Quando duas fontes independentes convergem desta forma, não é coincidência nem interpretação optimista — é o desenho mais consistente que esta carta tem para onde ganhas mais e onde és mais reconhecido a coincidirem na mesma opção.

Além disso, o planeta que mais pesa nesta carta está numa posição de força evidente e ligado directamente à acção e à iniciativa — a capacidade de avançar sozinho, sem esperar autorização de uma estrutura por cima de ti, é uma das partes mais fortes de todo o teu mapa, não uma zona neutra. Isso torna a hipótese de trabalhar a solo mais sustentada do que normalmente seria só pela tua vontade consciente de o tentar.

2. Vai custar-te instabilidade real nos primeiros tempos — sem uma estrutura a garantir-te um valor fixo ao fim do mês, a tua exigência interna de segurança financeira vai ser testada com mais intensidade do que a parte puramente técnica do trabalho. Não é um medo irracional: é uma tensão genuína entre a parte da tua carta que precisa de terreno firme debaixo dos pés e a parte que só se sente completa quando fala com autoridade própria. As duas coexistem, e vais senti-las em conflito principalmente nos primeiros 12 a 18 meses.

Há ainda um custo relacional que vale a pena nomear: ao saíres de uma estrutura, perdes automaticamente o crédito colectivo que hoje emprestas de uma empresa maior — quem te contratar vai avaliar-te só pelo teu nome, não pelo logótipo atrás de ti. Isso não é impossível de gerir, mas exige um tipo de exposição pessoal a que ainda não estás habituado.

3. Falta-te ainda uma rede de clientes que te procure directamente, e não através da estrutura onde trabalhas hoje — isto é algo que se aprende e se constrói, não algo que se compra nem que aparece por decreto. É precisamente o que mais separa quem tenta consultoria a solo de quem consegue viver dela de forma sustentável: não é competência técnica, é visibilidade e confiança construídas fora de um crachá.

A boa notícia é que isto não depende de talento inato nenhum que te falte — depende só de tempo e de repetição deliberada. É uma competência que se treina activamente, não um traço fixo de personalidade que ou tens ou não tens.

4. A tua matéria entra aqui pela forma como comunicas decisões difíceis com clareza — não pelo sector financeiro em si mesmo, mas pela tua capacidade de dizer a alguém, com segurança e sem ambiguidade, o que fazer a seguir quando ninguém mais está disposto a arriscar essa frase. É essa função — a de dar nome claro a uma decisão difícil — que a tua carta sustenta com mais força, independentemente de estares a fazê-lo dentro de contabilidade, gestão, ou qualquer outra área técnica.

Se um dia mudares de sector por completo, esta mesma função continuaria a ser onde encaixas melhor — o que confirma que não é o tema "finanças" que te sustenta aqui, é o papel que ocupas dentro dele.

### Finanças / contabilidade
FORÇA: moderada
1. Há suporte real nesta opção, mas menos directo do que na consultoria — continuar dentro da mesma área aproveita toda a experiência que já construíste ao longo destes anos, e isso tem valor real e mensurável no mercado. Ainda assim, esta opção sozinha não resolve a tensão de fundo que descreves: a falta de voz na decisão continua a existir mesmo que o título do cargo mude, se a estrutura de poder à tua volta não mudar com ele.

2. O custo aqui é subtil mas persistente: continuares a pagar o mesmo preço que já pagas hoje — ficares fisicamente perto da decisão sem seres tu a tomá-la — mesmo que o cargo passe a chamar-se "sénior" ou "gestor". Um título novo não é o mesmo que autoridade real sobre o resultado final, e é essa distinção que vai continuar a incomodar-te se não for endereçada explicitamente na negociação de qualquer novo papel.

Há também o risco de esta opção ser escolhida por segurança em vez de por desejo — o que, a prazo, tende a reproduzir exactamente a insatisfação que já sentes hoje, só que com um ordenado ligeiramente mais alto a compensar.

3. O que falta aqui é menos técnico e mais uma questão de posição dentro da hierarquia — precisas de um lugar onde a tua opinião conte ANTES da execução, não só depois dela já estar decidida por outros. Isto é negociável explicitamente numa entrevista ou numa promoção interna: pedir, por nome, que o papel inclua input na decisão, não só na sua implementação.

4. A tua matéria entra melhor aqui através de um papel de análise sénior ou de consultoria interna dentro da própria estrutura — nunca puramente executante, porque essa versão do trabalho volta a colidir directamente com a parte da tua carta que precisa de ser ouvida antes do facto consumado, não depois dele.

## Candidata fora da lista
CANDIDATA: nenhuma
Para uma terceira opção entrar aqui, precisariam de convergir pelo menos quatro camadas independentes da tua carta — e isso não acontece com nenhuma área fora das duas que já trazes. Isto não significa que a tua carta seja pobre ou limitada; significa que já identificaste, sozinho, as duas direcções que ela mais sustenta, o que é raro e vale a pena reconhecer como tal.

As duas opções que trouxeste — consultoria e permanência na área financeira — já cobrem entre si os dois eixos mais fortes da tua carta: a voz autónoma de um lado, a experiência acumulada do outro. Uma terceira via só faria sentido se algum destes dois eixos estivesse claramente por explorar, e não é o caso aqui.

Por isso, "a tua carta não aponta a nada fora do que já pensaste" é a resposta honesta e completa desta secção — não uma forma de evitar a pergunta. O trabalho que falta fazer não é encontrar mais opções, é decidir a forma que a opção escolhida vai tomar: a solo ou dentro de uma estrutura maior.

## O plano
O período que atravessas agora pede paciência antes de qualquer acção visível — é uma fase estruturalmente mais indicada para consolidar bases sólidas do que para anunciar mudanças públicas ou dar um salto grande de uma vez. Isto não é um sinal para não agires; é um sinal sobre o RITMO da acção, não sobre a sua ausência. Pequenos passos concretos, feitos com regularidade, valem mais neste momento do que uma decisão dramática tomada sob pressão.

A janela que se segue tende a abrir mais espaço concreto para decisões práticas ligadas a dinheiro e a recursos — é nessa fase, mais do que na actual, que faz sentido tomar compromissos financeiros maiores, como reduzir horas na estrutura actual ou assinar os primeiros contratos como consultor independente. Vale a pena começar a preparar-te agora para essa janela, sem forçares a entrada nela antes de tempo.

Depois dessa fase, entra um período historicamente mais associado a comunicação e negociação directa — exactamente o tipo de competência que a consultoria exige no dia a dia. Se a decisão final for avançar para essa via, é provável que essa fase seguinte facilite conversas comerciais que agora ainda parecem difíceis de iniciar.
PRIMEIRO PASSO: Esta semana, contacta duas pessoas que já fazem consultoria a solo na tua área e pergunta-lhes directamente o que ninguém conta sobre o primeiro ano — os erros, os meses mais difíceis, o que fariam de forma diferente. Não é para decidires já; é para substituíres o medo abstracto por dados reais antes de dares qualquer passo maior.
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

  const html = gerarHTMLRelatorio(dadosTemplate, TEXTO_EXEMPLO, axes, pesosPlanetas, axes.earningModeAll, datas, savPorCasa);

  // Corre sempre a partir de web/ (convenção dos outros scripts) — docs/
  // fica um nível acima, na raiz do repositório.
  const outDir = join(process.cwd(), "..", "docs");
  mkdirSync(outDir, { recursive: true });
  const nomeFicheiro = process.argv[2] || "relatorio-v2.html";
  const outPath = join(outDir, nomeFicheiro);
  writeFileSync(outPath, html, "utf-8");
  console.log(`Guardado em: ${outPath}`);
  console.log(`Tamanho: ${html.length} caracteres`);
  console.log(`Palavras no texto do LLM (exemplo): ${TEXTO_EXEMPLO.split(/\s+/).length}`);
}

main().catch((err) => {
  console.error("Falha no script de teste:", err);
  process.exit(1);
});

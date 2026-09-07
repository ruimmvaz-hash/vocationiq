// TAREFA 1 (correcção do especialista) — gera o HTML do João usando as
// FUNÇÕES REAIS DE PRODUÇÃO — construirIntakeAdolescente(),
// calcularDadosAstrologicosAdolescente(), construirPromptAdolescente(),
// gerarHTMLRelatorio() — as MESMAS que web/src/app/api/relatorio-adolescente/route.ts
// importa e chama. Não há reimplementação de lógica em lado nenhum deste
// script: tudo o que não seja o texto final do LLM passa pelas funções
// reais, sem alteração.
//
// LIMITAÇÃO HONESTA (impossível de contornar): a rota real chama a
// Anthropic 2-3 vezes (gerar → criticar → reescrever) — isto está
// dentro da própria rota, não é um passo opcional que se possa saltar
// de fora. Este ambiente nunca teve ANTHROPIC_API_KEY e a instrução desta
// ronda foi explicitamente "sem chamar a Anthropic". Por isso o TEXTO
// final (o que o LLM escreveria) é um placeholder escrito à mão — a
// ÚNICA peça que não vem da função real. Tudo o resto (dados técnicos,
// prompt construído, HTML renderizado) é 100% produção.
//
// Uso: npx tsx --require ./scripts/_no-server-only.cjs scripts/test-relatorio-joao-adolescente.ts

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { construirPromptAdolescente } from "@naveya/method-engine";
import { geocodeCityCountry } from "../src/lib/reportGeo";
import { localBirthTimeToUtc } from "../src/lib/localBirthTime";
import { calcularDadosAstrologicosAdolescente, construirIntakeAdolescente } from "../src/lib/relatorioAdultoCompute";
import { gerarHTMLRelatorio, type DadosParaTemplate } from "../src/lib/relatorioTemplate";
import type { IntakeRow } from "../src/lib/store";

// Placeholder do texto que a Anthropic escreveria — a ÚNICA peça não
// vinda de produção real (ver aviso no topo do ficheiro).
const TEXTO_EXEMPLO = `
FRASE_ABERTURA: A curiosidade que já tens por como as coisas funcionam por dentro é o teu ponto de partida mais honesto.
IDENTIDADE: Estratega em formação que pensa em rede antes de decidir

## Abertura
João traz três opções em cima da mesa — medicina, engenharia, design — e quer perceber qual delas o teu perfil sustenta com mais clareza, sem que isso decida nada por ti.

## Quem é
DOM: Tens uma capacidade natural para estruturar informação e ver o sistema todo antes de te comprometeres com uma parte isolada dele — isso vai ser uma vantagem real em qualquer percurso académico que exija organização e método.
DOM: Há uma harmonia natural entre o que sentes e a forma como o comunicas — quando algo te move, raramente tens dificuldade em pô-lo em palavras.
LIMITAÇÃO: A fluência de comunicação oral em situações de exposição vai precisar de atenção — não é natural, mas é treinável, e a maioria dos cursos que estás a considerar tem componentes práticas que ajudam a desenvolvê-la.
ELEMENTOS E MODALIDADES: a tua forma de processar o mundo tende para o pensamento e a comunicação, mais do que para a acção instintiva — isso explica porque preferes entender antes de agir.
O teu perfil sustenta genuinamente a solidez que se prova com o tempo, não o reconhecimento imediato.
SÍNTESE: És alguém talhado para pensar em rede antes de decidir, ainda a construir a confiança de comunicar essa força em voz alta.

## O que o perfil sustenta
O teu perfil aponta para uma área onde o que fazes paga directamente — sem precisares de um intermediário entre o que sabes fazer e o valor que isso gera.

## Leitura por opção
### medicina
FORÇA: moderada
INSIGHT: O perfil sustenta esta opção como a que achas mais provável hoje — vale a pena testá-la com clareza.
1. Duas fontes independentes tocam esta área, mas sem convergência forte.
2. Vai pedir-te um percurso longo de formação antes de trabalhares na área.
3. Curso: Medicina (mestrado, QNQ 7, 5-6 anos se integrado, Universidade ou Politécnico). Entrada: exame nacional de acesso comum, depois de um ano de internato geral.
4. A tua matéria entraria aqui pela precisão e responsabilidade, não pela urgência de acção.

### engenharia
FORÇA: moderada
INSIGHT: Uma opção ampla — o perfil ainda não distingue qual ramo específico.
1. O teu perfil sustenta o pensamento estruturado que a engenharia pede, sem apontar um ramo específico com força.
2. Vai pedir-te escolher um ramo concreto antes de avançar.
3. Curso: Engenharia Civil, Engenharia Informática ou Engenharia Mecânica (licenciatura ou mestrado, 3-5 anos, Universidade ou Politécnico). A inscrição profissional só é obrigatória para actos regulados — muitas funções técnicas não a exigem.
4. A tua matéria entraria pela estrutura, não pela execução manual.

### design
FORÇA: fraca
INSIGHT: Um sinal mais fraco do que as outras duas opções.
1. Não há convergência forte a sustentar esta opção como destino de fundo.
2. Vai custar-te mais do que nas outras opções construir uma base técnica sólida.
3. Curso: Design de Comunicação (licenciatura, QNQ 6, 3-4 anos, Universidade ou Politécnico). Não há certificação profissional obrigatória — a entrada faz-se por portefólio.
4. A tua matéria entraria pela estética, um território mais fraco no teu perfil.

## Candidata fora da lista
CANDIDATA: Direito
Quatro camadas independentes convergem aqui, incluindo o planeta mais forte do teu perfil e um sinal próprio da área de Direito. -- Via concreta para Direito --: licenciatura de 5-6 anos incluindo estágio profissional; a certificação exige exame de acesso à advocacia, através da ordem profissional da área.

CANDIDATA: Ciências da Educação
A mesma convergência do planeta mais forte, ligada aqui a sinais próprios do ensino. -- Via concreta para Ciências da Educação --: licenciatura de 3-4 anos para funções fora da sala de aula; para dar aulas, precisas de mais um mestrado em ensino.

## O plano
O período actual favorece explorar sem pressa — não é o momento de fechar a decisão, é o de testar as três opções contra o que já sabes de ti.
PRIMEIRO PASSO: Esta semana, marca uma conversa com alguém que já estuda ou trabalha em cada uma das três áreas, e pergunta-lhe o que ninguém conta sobre o primeiro ano.
`.trim();

async function main() {
  const nome = "João (teste adolescente)";
  const dataNascimento = "2008-03-15";
  const horaNascimento = "10:30";
  const localNascimento = "Lisboa, Portugal";

  const intake: IntakeRow = {
    id: "teste-joao",
    created_at: new Date().toISOString(),
    nome,
    data_nascimento: dataNascimento,
    hora_nascimento: horaNascimento,
    local_nascimento: localNascimento,
    situacao: "10-11-12",
    contexto: null,
    email: null,
    stripe_checkout_session_id: null,
    amount_cents: null,
    referral_code: null,
    payment_status: "paid",
    paid_at: new Date().toISOString(),
    report_status: "not_started",
    delivered_at: null,
    revisao_email_enviado: false,
    revisao_email_180_enviado: false,
    alerta_36h_enviado: false,
    clareza_ideia: "duas-tres-opcoes",
    areas_consideradas: null,
    areas_consideradas_outra: null,
    preferencia_familia: "Os meus pais preferiam que eu seguisse medicina.",
    opcoes_adolescente: ["medicina", "engenharia", "design"],
    opcao_mais_provavel: "medicina",
    ano_escolaridade: "10-a-12",
    curso_actual: null,
    satisfacao_curso: null,
    area_trabalho_actual: null,
    anos_experiencia: null,
    o_que_nao_funciona: null,
    tipo_mudanca: null,
    areas_destino: null,
    areas_destino_outra: null,
    ideia_concreta: null,
    para_onde_quer_ir: null,
    descricao_situacao: null,
    contexto_adicional: null,
    pergunta_especifica: null,
  };

  // Controlo (fora do pipeline): confirma que os dados de nascimento resolvem.
  const geo = await geocodeCityCountry(localNascimento);
  if (!geo) throw new Error(`Não consegui geocodificar "${localNascimento}"`);
  const [year, month, day] = dataNascimento.split("-").map(Number);
  const utcDate = localBirthTimeToUtc({ day, month, year }, horaNascimento, geo.timezone);
  if (!utcDate) throw new Error("data/hora inválida");

  console.log("=== FUNÇÃO REAL: calcularDadosAstrologicosAdolescente() ===");
  const dados = await calcularDadosAstrologicosAdolescente(intake);
  console.log("(dados técnicos calculados pelo motor real — não placeholders)");

  console.log("\n=== FUNÇÃO REAL: construirIntakeAdolescente() ===");
  const intakeAdolescente = construirIntakeAdolescente(intake);
  console.log(JSON.stringify(intakeAdolescente, null, 2));

  console.log("\n=== FUNÇÃO REAL: construirPromptAdolescente() ===");
  const prompt = construirPromptAdolescente(
    intakeAdolescente,
    dados.axes,
    dados.pesosPlanetas,
    dados.datas,
    !dados.horaAproximada,
    dados.catalogoResultados,
    dados.savPorCasa,
    dados.elementosModalidades,
    dados.aspectosPessoais,
    dados.cursosPorDestino,
    dados.cursosPorOpcaoDeclarada,
    dados.d1,
    dados.yogas,
  );
  console.log(`(prompt real gerado — ${prompt.length} caracteres)`);

  console.log("\n=== FUNÇÃO REAL: gerarHTMLRelatorio() — com texto placeholder (única peça não-produção, ver aviso no topo) ===");
  const dadosTemplate: DadosParaTemplate = {
    nome: intake.nome,
    dataNascimento: intake.data_nascimento,
    horaNascimento: dados.horaAproximada ? null : intake.hora_nascimento,
    localNascimento: intake.local_nascimento,
    situacaoDeclarada: intakeAdolescente.situacaoDeclarada,
    ehAdolescente: true,
    anoEscolaridade: intakeAdolescente.anoEscolaridade === "10-a-12" ? "10º ao 12º ano" : intakeAdolescente.anoEscolaridade,
    areaActual: "Ainda a estudar",
    anosExperiencia: intakeAdolescente.situacaoDeclarada,
    opcoesConsideradas: intakeAdolescente.opcoesAdolescente,
    perguntaEspecifica: intakeAdolescente.opcaoMaisProvavel ? `Qual das opções te parece mais provável hoje: ${intakeAdolescente.opcaoMaisProvavel}?` : undefined,
  };
  const html = gerarHTMLRelatorio(dadosTemplate, TEXTO_EXEMPLO, dados.axes, dados.pesosPlanetas, dados.axes.earningModeAll, dados.datas, dados.savPorCasa, dados.catalogoResultados);

  const outDir = join(process.cwd(), "..", "docs");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "relatorio-joao-adolescente.html");
  writeFileSync(outPath, html, "utf-8");
  console.log(`Guardado em: ${outPath}`);

  console.log("\n=== As 4 secções pedidas (TAREFA 2), texto exacto do prompt real ===");
  for (const marcador of [
    "-- Perfil de elementos e modalidades --",
    "-- Aspectos principais --",
    "Candidatas com ≥4 convergências",
    "-- Via concreta para",
    "-- Avasthas (maturidade dos planetas) --",
    "-- Conjunções activas --",
    "-- Yogas activos --",
    "-- Vargottama --",
  ]) {
    const idx = prompt.indexOf(marcador);
    console.log(`\n[${marcador}]`);
    console.log(idx === -1 ? "AUSENTE" : prompt.slice(idx, idx + 400));
  }
}

main().catch((err) => {
  console.error("Falha no script:", err);
  process.exit(1);
});

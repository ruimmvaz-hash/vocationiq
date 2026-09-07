// TAREFA 1B (correcção do especialista) — gera o HTML da Nádia usando as
// FUNÇÕES REAIS DE PRODUÇÃO — construirIntakeAdulto() (chamada
// internamente por calcularDadosAstrologicos()), calcularDadosAstrologicos(),
// construirPromptAdulto(), gerarHTMLRelatorio() — as MESMAS que
// web/src/app/api/relatorio/route.ts importa e chama. Não há
// reimplementação de lógica: um IntakeRow sintético mas com os dados
// reais de nascimento da Nádia entra directamente na função de produção.
//
// LIMITAÇÃO HONESTA: mesmo aviso que em test-relatorio-joao-adolescente.ts
// — a rota real chama a Anthropic 2-3 vezes; este ambiente não tem
// ANTHROPIC_API_KEY e a instrução desta ronda foi "sem chamar a
// Anthropic". O TEXTO final é um placeholder escrito à mão — a ÚNICA
// peça que não vem da função real.
//
// Uso: npx tsx --require ./scripts/_no-server-only.cjs scripts/test-relatorio-nadia-v3.ts

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { construirPromptAdulto } from "@naveya/method-engine";
import { calcularDadosAstrologicos } from "../src/lib/relatorioAdultoCompute";
import { gerarHTMLRelatorio, type DadosParaTemplate } from "../src/lib/relatorioTemplate";
import type { IntakeRow } from "../src/lib/store";

const TEXTO_EXEMPLO = `
FRASE_ABERTURA: A voz que ainda não usou em público já é o activo mais valioso da sua carta.
IDENTIDADE: Autoridade estrutural que constrói com paciência o que outros anunciam depressa

## Abertura
Nádia diz que está numa fase de mudar de rumo profissional, mas ainda sem uma direcção concreta declarada — chega a este relatório a pedir que a carta lhe mostre o que ela própria ainda não nomeou.

## Quem é
DOM: Uma capacidade de liderar publicamente que a sua carta sustenta com clareza, mesmo que ainda não a tenha exercido a sério.
DOM: Uma estrutura interior sólida, construída para durar, que raramente se vê abalada por pressão de curto prazo — a sua forma de processar o mundo é mais fixa e persistente do que impulsiva.
LIMITAÇÃO: A gestão emocional em decisões importantes pede atenção à primeira vista — mas essa mesma sensibilidade está directamente ligada a um dos planetas mais generosos da sua carta, o que na prática transforma o que parecia ser um ponto frágil num recurso discreto.
LIMITAÇÃO: A fluidez de explicar e ser entendida ainda precisa de ser construída — isto liga-se de perto à forma como pensa e ao que valoriza esteticamente, que na sua carta operam quase fundidos.
O que genuinamente valoriza é a substância que aguenta o tempo, não o efeito imediato.
SÍNTESE: É alguém talhada para liderar com estrutura, mas ainda a aprender a comunicar essa força em voz alta.

## O que a carta sustenta
A sua carta aponta com clareza para a liderança pública como a forma mais forte de gerar valor.

## Leitura por opção
### Empresária
FORÇA: moderada
INSIGHT: A estrutura para liderar já existe — falta ainda o canal para a expressar com clareza.
1. A carta sustenta a liderança de um projecto próprio com uma base real.
2. Vai custar-lhe mais do que a outros comunicar essa liderança com clareza.
3. Falta-lhe ainda experiência de comunicar em público de forma repetida.
4. A sua matéria entra aqui pela forma como estrutura e sustenta.

## Candidata fora da lista
CANDIDATA: Ciências da Informação e Documentação
Quatro camadas independentes convergem nesta área. -- Via concreta --: licenciatura de 3-4 anos; sem certificação profissional própria; entrada por concurso público ou candidatura directa a instituições privadas com arquivo próprio.

CANDIDATA: Contabilidade e Fiscalidade
A mesma convergência do planeta mais forte, ligada à forma como ganha melhor. -- Via concreta --: licenciatura + período de experiência antes da certificação que permite assinar contas em nome próprio.

CANDIDATA: História
A terceira convergência independente. -- Via concreta --: licenciatura de 3-4 anos; entrada depende da especialização escolhida.

## O plano
O período actual pede que prepare e feche o que já não serve, antes de colher o que vem a seguir.
PRIMEIRO PASSO: Esta semana, escreva por escrito a ideia de projecto que tem em mente, com o máximo de detalhe possível.
`.trim();

async function main() {
  const intake: IntakeRow = {
    id: "teste-nadia-v3",
    created_at: new Date().toISOString(),
    nome: "Nádia (teste)",
    data_nascimento: "1983-01-10",
    hora_nascimento: "15:02",
    local_nascimento: "Luanda, Angola",
    situacao: "trabalho-quero-mudar",
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
    clareza_ideia: null,
    areas_consideradas: null,
    areas_consideradas_outra: null,
    preferencia_familia: null,
    opcoes_adolescente: null,
    opcao_mais_provavel: null,
    ano_escolaridade: null,
    curso_actual: null,
    satisfacao_curso: null,
    area_trabalho_actual: "Empresária",
    anos_experiencia: "5-a-10",
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

  console.log("=== FUNÇÃO REAL: calcularDadosAstrologicos() ===");
  const dados = await calcularDadosAstrologicos(intake);
  console.log("(dados técnicos calculados pelo motor real — não placeholders)");
  console.log("Candidatas fora da lista:", dados.catalogoResultados.candidatasForaDaLista.map((c) => c.nome).join(", "));

  console.log("\n=== FUNÇÃO REAL: construirPromptAdulto() ===");
  const prompt = construirPromptAdulto(
    dados.intakeAdulto,
    dados.axes,
    dados.pesosPlanetas,
    dados.datas,
    !dados.horaAproximada,
    dados.catalogoResultados,
    dados.savPorCasa,
    dados.elementosModalidades,
    dados.aspectosPessoais,
    dados.cursosPorDestino,
  );
  console.log(`(prompt real gerado — ${prompt.length} caracteres)`);

  const dadosTemplate: DadosParaTemplate = {
    nome: intake.nome,
    dataNascimento: intake.data_nascimento,
    horaNascimento: dados.horaAproximada ? null : intake.hora_nascimento,
    localNascimento: intake.local_nascimento,
    situacaoDeclarada: dados.intakeAdulto.situacaoDeclarada,
    areaActual: dados.intakeAdulto.areaActual,
    anosExperiencia: dados.intakeAdulto.anosExperiencia,
    opcoesConsideradas: [],
  };
  const html = gerarHTMLRelatorio(dadosTemplate, TEXTO_EXEMPLO, dados.axes, dados.pesosPlanetas, dados.axes.earningModeAll, dados.datas, dados.savPorCasa, dados.catalogoResultados);

  const outDir = join(process.cwd(), "..", "docs");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "relatorio-nadia-v3.html");
  writeFileSync(outPath, html, "utf-8");
  console.log(`Guardado em: ${outPath}`);

  console.log("\n=== As 4 secções pedidas (TAREFA 2), texto exacto do prompt real ===");
  for (const marcador of ["-- Perfil de elementos e modalidades --", "-- Aspectos principais --", "Candidatas com ≥4 convergências", "-- Via concreta para"]) {
    const idx = prompt.indexOf(marcador);
    console.log(`\n[${marcador}]`);
    console.log(idx === -1 ? "AUSENTE" : prompt.slice(idx, idx + 400));
  }
}

main().catch((err) => {
  console.error("Falha no script:", err);
  process.exit(1);
});

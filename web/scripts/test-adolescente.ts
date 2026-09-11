// TAREFA 1/2 (correcção do especialista, ronda de produção) — caso de
// teste ponta-a-ponta do ramo adolescente, com um IntakeRow sintético que
// exercita as FUNÇÕES REAIS DE PRODUÇÃO (calcularDadosAstrologicosAdolescente,
// construirIntakeAdolescente, construirPromptAdolescente) — não uma
// réplica manual da lógica, para apanhar bugs de integração entre a rota
// e a camada de cálculo. Corre SEM chamar a Anthropic (só imprime o
// prompt gerado, nunca o envia).
//
// Uso: npx tsx scripts/test-adolescente.ts [--ano=7-a-9|10-a-12]
//
// REVERTIDO (correcção do especialista) — `--ano` foi acrescentado só
// para confirmar por regressão que "7-a-9" e "10-a-12" produzem hoje o
// MESMO prompt em estrutura (a distinção dentro de promptAdolescente.ts
// foi removida) — nunca para reintroduzir a distinção aqui.

import { construirPromptAdolescente } from "@naveya/method-engine";
import { geocodeCityCountry } from "../src/lib/reportGeo";
import { localBirthTimeToUtc } from "../src/lib/localBirthTime";
import { calcularDadosAstrologicosAdolescente } from "../src/lib/relatorioAdultoCompute";
import type { IntakeRow } from "../src/lib/store";

function arg(name: string): string {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : "";
}

async function main() {
  const nome = "João (teste adolescente)";
  const dataNascimento = "2008-03-15";
  const horaNascimento = "10:30";
  const localNascimento = "Lisboa, Portugal";

  // IntakeRow sintético — os campos que calcularDadosAstrologicosAdolescente()
  // e construirIntakeAdolescente() realmente lêem; o resto fica com valores
  // neutros (nunca lidos pelo ramo adolescente).
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
    alerta_60h_enviado: false,
    clareza_ideia: "duas-tres-opcoes",
    areas_consideradas: null,
    areas_consideradas_outra: null,
    preferencia_familia: "Os meus pais preferiam que eu seguisse medicina.",
    opcoes_adolescente: ["medicina", "engenharia", "design"],
    opcao_mais_provavel: "medicina",
    ano_escolaridade: (arg("ano") || "10-a-12") as "7-a-9" | "10-a-12",
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
    aniversario_email_enviado_ano: null,
    mahadasha_alerta_enviado_em: null,
    mahadasha_alerta_para_data: null,
    cliente_codigo_referral: null,
    referral_creditado: false,
  };

  console.log("=== Geocodificação de controlo ===");
  const geo = await geocodeCityCountry(localNascimento);
  if (!geo) throw new Error(`Não consegui geocodificar "${localNascimento}"`);
  const [year, month, day] = dataNascimento.split("-").map(Number);
  const utcDate = localBirthTimeToUtc({ day, month, year }, horaNascimento, geo.timezone);
  if (!utcDate) throw new Error("data/hora inválida");
  console.log("OK");

  console.log("\n=== calcularDadosAstrologicosAdolescente() — pipeline de produção ===");
  const dados = await calcularDadosAstrologicosAdolescente(intake);
  console.log(`Ascendente/Atmakaraka: ${dados.axes.missionAxis.atmakaraka} (casa ${dados.axes.missionAxis.akHouse})`);
  console.log(`Modo de Ganho dominante: casa ${dados.axes.earningModeDominante[0].house}`);
  console.log(`Elementos e modalidades: ${JSON.stringify(dados.elementosModalidades)}`);
  console.log(`Aspectos pessoais: ${dados.aspectosPessoais.map((a) => `${a.planetaA} ${a.aspecto} ${a.planetaB}`).join(" | ") || "(nenhum)"}`);
  console.log(`Candidatas fora da lista (até 3): ${dados.catalogoResultados.candidatasForaDaLista.map((c) => c.nome).join(", ") || "nenhuma"}`);
  console.log("\nCursos por opção declarada:");
  for (const [opcao, cursos] of Object.entries(dados.cursosPorOpcaoDeclarada)) {
    console.log(`- ${opcao}: ${cursos.map((c) => c.cursos[0].nome).join(", ")}`);
  }
  const opcoesSemCorrespondencia = dados.intakeAdolescente.opcoesAdolescente.filter((o) => !dados.cursosPorOpcaoDeclarada[o]);
  if (opcoesSemCorrespondencia.length) console.log(`Opções SEM correspondência no mapeamento: ${opcoesSemCorrespondencia.join(", ")}`);

  console.log("\n=== construirPromptAdolescente() — prompt completo (nunca enviado à Anthropic) ===");
  const prompt = construirPromptAdolescente(
    dados.intakeAdolescente,
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
  console.log(prompt);

  console.log(`\nOcorrências de "carta" no prompt (esperado: 3, só dentro da regra que a proíbe): ${(prompt.match(/\bcarta\b/gi) ?? []).length}`);

  console.log("\n=== Confirmação de conteúdo ===");
  const checks: [string, boolean][] = [
    ["Dados técnicos completos (Eixo da Missão)", prompt.includes("Eixo da Missão")],
    ["Elementos e modalidades", prompt.includes("Elemento dominante")],
    ["Aspectos principais", prompt.includes("Aspectos principais")],
    ["Cursos concretos por opção declarada", prompt.includes("Curso:")],
    ["Via concreta para candidata fora da lista", prompt.includes("Via concreta para")],
    ["Secção de candidata fora da lista", prompt.includes("Candidatas do catálogo")],
    ["Tom 'tu' (nunca 'você')", prompt.includes('usa "tu"') && !prompt.includes("Usa SEMPRE")],
  ];
  for (const [label, ok] of checks) console.log(`${ok ? "✓" : "✗"} ${label}`);
}

main().catch((err) => {
  console.error("Falha no script de teste:", err);
  process.exit(1);
});

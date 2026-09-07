// TAREFA 1B (correcção do especialista) — gera o HTML da Melina usando
// as FUNÇÕES REAIS DE PRODUÇÃO — mesma nota de test-relatorio-nadia-v3.ts.
// Fixture real (São Paulo, 11/12/1984, 08:30 local) — a mesma usada em
// method-engine/test/catalogoVocacional.test.ts.
//
// Uso: npx tsx --require ./scripts/_no-server-only.cjs scripts/test-relatorio-melina-v3.ts

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { construirPromptAdulto } from "@naveya/method-engine";
import { calcularDadosAstrologicos } from "../src/lib/relatorioAdultoCompute";
import { gerarHTMLRelatorio, type DadosParaTemplate } from "../src/lib/relatorioTemplate";
import type { IntakeRow } from "../src/lib/store";

const TEXTO_EXEMPLO = `
FRASE_ABERTURA: A estrutura que já tem no corpo pede agora um lugar onde possa assinar por baixo dela.
IDENTIDADE: Autoridade prática que constrói valor duradouro sem precisar de o anunciar

## Abertura
Melina traz uma pergunta sobre se deve continuar na área da estética ou procurar algo que aproveite melhor a estrutura que sente ter por dentro.

## Quem é
DOM: O seu planeta mais forte está exaltado e a reger duas casas ligadas ao rendimento.
DOM: Há uma urgência de agir directamente sobre o que quer que lhe é natural — a sua forma de processar o mundo é firme e persistente, não impulsiva.
LIMITAÇÃO: O que sente por dentro e o que valoriza nas relações puxam em direcções opostas.
LIMITAÇÃO: A forma como pensa e comunica está ligada de perto à sua identidade consciente — quando fala de si, fá-lo quase sem filtro.
O que genuinamente valoriza é a solidez que se prova com o tempo.
SÍNTESE: É alguém talhada para transformar estrutura em resultado prático, ainda a decidir onde essa estrutura rende mais.

## O que o perfil sustenta
O seu perfil aponta com clareza para uma área onde o que faz paga directamente.

## Leitura por opção
### Estética
FORÇA: fraca
INSIGHT: A área actual não é onde o seu planeta mais forte está a apontar com mais clareza.
1. Não há convergência forte a sustentar a estética como destino de fundo.
2. Continuar aqui custa-lhe não render ao máximo o seu planeta mais forte.
3. Falta-lhe ainda uma ponte concreta entre o que já sabe fazer e a área que o perfil sustenta com mais força.
4. A sua matéria entra por rigor e disciplina, não pela componente estética.

## Candidata fora da lista
CANDIDATA: Auditoria e Controlo de Gestão
Quatro camadas independentes convergem aqui. -- Via concreta --: licenciatura de 3-5 anos; para auditoria interna não há certificação legal obrigatória — entra-se por posição júnior e progressão por experiência.

CANDIDATA: Contabilidade e Fiscalidade
A mesma convergência do planeta mais forte. -- Via concreta --: licenciatura + período de experiência antes da certificação profissional.

CANDIDATA: Engenharia Civil
A terceira convergência independente. -- Via concreta --: licenciatura ou mestrado de 3-5 anos; inscrição profissional só obrigatória para projectos regulados.

## O plano
O período actual favorece avançar — não é momento de espera.
PRIMEIRO PASSO: Esta semana, liste as competências técnicas que já domina na área actual e que se transferem directamente para gestão/números.
`.trim();

async function main() {
  const intake: IntakeRow = {
    id: "teste-melina-v3",
    created_at: new Date().toISOString(),
    nome: "Melina (teste)",
    // BirthInput real é construído directamente (fixture com UTC/lat/long
    // exactos, ver método-engine/test/catalogoVocacional.test.ts) — os
    // campos de string abaixo (data/hora/local) servem só para o
    // resolverNascimento() textual do pipeline de produção; usam a
    // conversão equivalente (08:30 local em São Paulo, fuso UTC-3, dá
    // 11:30 UTC em 11/12/1984 — a mesma fixture).
    data_nascimento: "1984-12-11",
    hora_nascimento: "08:30",
    local_nascimento: "São Paulo, Brasil",
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
    area_trabalho_actual: "Estética",
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
    dados.d1,
    dados.yogas,
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
  const outPath = join(outDir, "relatorio-melina-v3.html");
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

  // Correcção do especialista (ronda seguinte) — confirma que as 4
  // instruções "REGRAS OBRIGATÓRIAS" chegam mesmo ao prompt real, com o
  // texto exacto (não só a secção de dados) — o diagnóstico pedido era
  // exactamente isto: "a instrução está a chegar ao prompt gerado?".
  console.log("\n=== Presença das 4 instruções REGRAS OBRIGATÓRIAS no prompt real ===");
  for (const instrucao of ["AVASTHAS — REGRAS OBRIGATÓRIAS", "CONJUNÇÕES — REGRAS OBRIGATÓRIAS", "YOGAS — REGRAS OBRIGATÓRIAS", "VARGOTTAMA — INSTRUÇÃO OBRIGATÓRIA"]) {
    console.log(`${instrucao}: ${prompt.includes(instrucao) ? "PRESENTE" : "AUSENTE"}`);
  }
  console.log(`\nOcorrências de "Raja Yoga:" no prompt: ${(prompt.match(/Raja Yoga:/g) ?? []).length}`);
  console.log(`Ocorrências de "Viparita Raja Yoga" no prompt: ${(prompt.match(/Viparita Raja Yoga/g) ?? []).length}`);
  console.log(`Ocorrências de "Vargottama" no prompt (dados + instrução): ${(prompt.match(/Vargottama/g) ?? []).length}`);
}

main().catch((err) => {
  console.error("Falha no script:", err);
  process.exit(1);
});

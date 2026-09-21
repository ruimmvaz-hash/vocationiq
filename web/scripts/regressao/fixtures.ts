// Suite de regressão contra clientes reais (item 7 do plano da auditoria de
// hoje, "sem falta" — pedido directo do fundador). Objectivo único: nunca
// mais corrigir um caso e partir outro sem se dar conta — o padrão que se
// repetiu ao longo dos últimos 4 meses (ver `docs/` e o histórico de
// commits: Melina TAREFA #38 reaberta, Miguel/Vénus removido e depois
// restaurado, Alexandra "regeneração 3", "pergunta específica" ignorada no
// ramo adolescente).
//
// Dados de nascimento REAIS de clientes reais que já pagaram — nunca
// sintéticos. Cada fixture tem coordenadas fixas (`coordenadasExistentes`)
// porque este ambiente de execução não tem acesso à API de geocodificação
// (Open-Meteo, bloqueada pela política de rede) — exactamente o mesmo
// mecanismo que a produção usa para nunca regeocodificar duas vezes
// (`viq_relatorios.coordenadas_nascimento`), aqui aplicado por necessidade
// técnica, não por escolha.
//
// LACUNAS CONHECIDAS, deixadas explícitas em vez de escondidas com dados
// inventados: João (nunca teve dados de nascimento reais disponíveis
// neste repositório, ver commit a47a8f7) NÃO está aqui. Adicionar os
// dados dele nunca deve ser feito com dados inventados — só com o birth
// data real, pedido ao Rui.
//
// Miguel foi adicionado (item 7, 21 Set) com dados de nascimento reais.
// Só o nascimento é real e conhecido nesta ronda — sem clareza_ideia/
// áreas consideradas/preferência da família reais disponíveis, por isso
// esses campos ficam por preencher (nunca inventados).

import type { IntakeRow } from "../../src/lib/store";
import type { CoordenadasNascimento } from "../../src/lib/relatorioAdultoCompute";

export interface FixtureClienteReal {
  chave: string;
  ramo: "adulto" | "adolescente";
  coordenadas: CoordenadasNascimento;
  intake: IntakeRow;
}

function intakeBase(overrides: Partial<IntakeRow> & Pick<IntakeRow, "id" | "nome" | "data_nascimento" | "hora_nascimento" | "local_nascimento" | "situacao">): IntakeRow {
  return {
    created_at: new Date().toISOString(),
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
    clareza_ideia: null,
    areas_consideradas: null,
    areas_consideradas_outra: null,
    preferencia_familia: null,
    opcoes_adolescente: null,
    opcao_mais_provavel: null,
    ano_escolaridade: null,
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
    ...overrides,
  };
}

export const FIXTURES: FixtureClienteReal[] = [
  {
    chave: "rui",
    ramo: "adulto",
    coordenadas: { latitude: 41.1579, longitude: -8.6291, timezone: "Europe/Lisbon", localNormalizado: "Porto, Portugal" },
    intake: intakeBase({
      id: "regressao-rui",
      nome: "Rui (fixture real)",
      data_nascimento: "1988-04-12",
      hora_nascimento: "07:35",
      local_nascimento: "Porto, Portugal",
      situacao: "trabalho-quero-mudar",
      area_trabalho_actual: "Empreendedorismo / negócios próprios",
      anos_experiencia: "mais-10",
    }),
  },
  {
    chave: "melina",
    ramo: "adulto",
    coordenadas: { latitude: -23.5505, longitude: -46.6333, timezone: "America/Sao_Paulo", localNormalizado: "São Paulo, Brasil" },
    intake: intakeBase({
      id: "regressao-melina",
      nome: "Melina (fixture real)",
      data_nascimento: "1984-12-11",
      hora_nascimento: "08:30",
      local_nascimento: "São Paulo, Brasil",
      situacao: "trabalho-quero-mudar",
      area_trabalho_actual: "Estética",
      anos_experiencia: "6-10",
    }),
  },
  {
    chave: "nadia",
    ramo: "adulto",
    coordenadas: { latitude: -8.8383, longitude: 13.2344, timezone: "Africa/Luanda", localNormalizado: "Luanda, Angola" },
    intake: intakeBase({
      id: "regressao-nadia",
      nome: "Nádia (fixture real)",
      data_nascimento: "1983-01-10",
      hora_nascimento: "15:02",
      local_nascimento: "Luanda, Angola",
      situacao: "trabalho-quero-mudar",
      area_trabalho_actual: "Não especificada na fixture",
      anos_experiencia: "6-10",
    }),
  },
  {
    chave: "alexandra",
    ramo: "adolescente",
    coordenadas: { latitude: -8.8383, longitude: 13.2344, timezone: "Africa/Luanda", localNormalizado: "Luanda, Angola" },
    intake: intakeBase({
      id: "regressao-alexandra",
      nome: "Alexandra (fixture real)",
      data_nascimento: "2010-08-10",
      hora_nascimento: "12:52",
      local_nascimento: "Luanda, Angola",
      situacao: "10-11-12",
      clareza_ideia: "duas-tres-opcoes",
      areas_consideradas: ["Economia / Gestão", "Direito"],
      preferencia_familia: "o meu pai gestão ou economia e a minha mãe diz que tenho jeito para direito",
      opcoes_adolescente: ["gestão", "economia"],
      opcao_mais_provavel: "gestao",
      ano_escolaridade: "10-a-12",
      pergunta_especifica: "devo seguir economia, gestão ou direito?",
    }),
  },
  {
    // Dados de nascimento reais (item 7 — cobertura pedida pelo Rui,
    // "avança", 21 Set). Só os dados de nascimento são reais e conhecidos
    // nesta ronda — sem clareza_idea/areas_consideradas/preferencia_familia
    // reais disponíveis neste repositório, por isso ficam por preencher
    // (nunca inventados) em vez de com valores a fingir ser declarações
    // reais dele. Isto basta para o snapshot de candidatas (o que esta
    // suite verifica); não valida guardas que dependem de contexto
    // declarado (ex. critério 36, pergunta específica).
    chave: "miguel",
    ramo: "adolescente",
    coordenadas: { latitude: 38.7223, longitude: -9.1393, timezone: "Europe/Lisbon", localNormalizado: "Lisboa, Portugal" },
    intake: intakeBase({
      id: "regressao-miguel",
      nome: "Miguel (fixture real)",
      data_nascimento: "2010-09-07",
      hora_nascimento: "18:00",
      local_nascimento: "Lisboa, Portugal",
      situacao: "10-11-12",
    }),
  },
];

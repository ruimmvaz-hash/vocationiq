// FASE 1, Passo 6 — ponto de entrada público do motor v3. Por pedido
// explícito ("Actualizar index.ts para exportar: gerarRelatorioV3,
// verificarRelatorioV3, Todos os tipos de types-v3.ts"), não um barrel
// de tudo o que os módulos internos de v3/ exportam — quem precisar de
// peças internas (diagramas.ts, linguagem-naveya.ts, etc.) importa-as
// directamente, como o resto do motor já faz.

export { gerarRelatorioV3, type EntradaOrquestradorV3, type OpcoesOrquestrador } from "./orquestrador";
export { verificarRelatorioV3, type ResultadoVerificacao, type ChamadaLLM } from "./verificacao";

export type {
  NiveauConfianca,
  Descoberta,
  AberturaV3,
  SavPorCasa,
  EntradaRastreio,
  PontoFiguraNaveya,
  EntradaFiguraFechada,
  AnexoB,
  DesfechoEspinha,
  LinhaRetrato,
  Retrato60s,
  RelatorioV3,
  NakshatraComPada,
  SavComFiabilidade,
  CamadaA,
  ResultadoMotorV3,
  BirthInput,
} from "../types-v3";
